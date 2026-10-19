
import { Router } from "express";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

export const fieldRouter = Router();
fieldRouter.use(requireAuth);

function role(res:any) { return res.locals.user?.role?.name ?? res.locals.user?.roleEnum; }
function actor(res:any) { return res.locals.user.id as string; }
function newId() { return crypto.randomUUID(); }

function allow(res:any, roles:string[], permission?:string) {
  if (!roles.includes(role(res))) {
    res.status(403).json({message:"This action is not available for your role"});
    return false;
  }
  if (permission) {
    const granted = res.locals.user?.role?.permissions?.some((item:any)=>item.permission.key===permission) ?? false;
    if (!granted) {
      res.status(403).json({message:"Required permission is not granted"});
      return false;
    }
  }
  return true;
}

async function audit(req:any, res:any, action:string, entity:string, entityId?:string, metadata?:any) {
  await prisma.auditLog.create({
    data:{actorUserId:actor(res),action,entity,entityId,ipAddress:req.ip,userAgent:req.get("user-agent"),metadata}
  }).catch(()=>undefined);
}

/**
 * Field dashboard. The response is deliberately role-specific while using
 * the same application/database/session as the admin portals.
 */
fieldRouter.get("/dashboard", async (_req,res)=>{
  const r=role(res);
  const uid=actor(res);
  const today=new Date(); today.setHours(0,0,0,0);
  const tomorrow=new Date(today); tomorrow.setDate(tomorrow.getDate()+1);

  if (r==="SCIENCE_COMMUNICATOR") {
    const events=await prisma.event.findMany({
      where:{EventsOnCommunicator:{some:{userId:uid}}},
      include:{
        School:true,
        Bus:true,
        ExperimentSession:{include:{Experiment:true}},
        EventsOnCommunicator:{include:{User:{select:{id:true,name:true,fullName:true,email:true}}}}
      },
      orderBy:{eventDate:"asc"}, take:100
    });
    const todayEvents=events.filter(e=>e.eventDate>=today && e.eventDate<tomorrow);
    const upcoming=events.filter(e=>e.eventDate>=today);
    const busIds=Array.from(new Set(events.map(e=>e.busId)));
    const [labs,issues,inventory]=await Promise.all([
      prisma.bus.findMany({where:{id:{in:busIds}}}),
      prisma.operationalIssue.findMany({where:{reportedById:uid},orderBy:{createdAt:"desc"},take:10}),
      prisma.inventoryTransaction.findMany({where:{busId:{in:busIds}},include:{consumable:true},orderBy:{timestamp:"desc"},take:30})
    ]);
    return res.json({
      role:r, user:{id:uid,name:res.locals.user.name,email:res.locals.user.email,regionId:res.locals.user.regionId},
      kpis:{todayVisits:todayEvents.length,upcomingVisits:upcoming.length,sessionsToday:todayEvents.length,
        openIssues:issues.filter((x:any)=>!["RESOLVED","CLOSED"].includes(x.status)).length,
        inventoryAlerts:labs.length},
      todayVisits:todayEvents, upcomingVisits:upcoming, labs, issues, inventory
    });
  }

  if (r==="DRIVER") {
    const trips=await prisma.trip.findMany({
      where:{driverId:uid},
      include:{Bus:true,Route:{include:{RouteStop:{include:{School:true},orderBy:{stopOrder:"asc"}}}}},
      orderBy:{scheduledDate:"asc"},take:100
    });
    const todayTrips=trips.filter(t=>t.scheduledDate>=today && t.scheduledDate<tomorrow);
    const upcoming=trips.filter(t=>t.scheduledDate>=today);
    const bus=await prisma.bus.findUnique({where:{driverId:uid}});
    const issues=await prisma.operationalIssue.findMany({where:{reportedById:uid},orderBy:{createdAt:"desc"},take:10});
    return res.json({
      role:r,user:{id:uid,name:res.locals.user.name,email:res.locals.user.email,regionId:res.locals.user.regionId},
      kpis:{todayTrips:todayTrips.length,upcomingTrips:upcoming.length,openIssues:issues.filter((x:any)=>!["RESOLVED","CLOSED"].includes(x.status)).length},
      todayTrips,upcomingTrips:upcoming,bus,issues
    });
  }

  return res.status(403).json({message:"Field dashboard is only available to Instructor / Driver"});
});

fieldRouter.get("/events", async (_req,res)=>{
  if(!allow(res,["SCIENCE_COMMUNICATOR"],"field.session.view")) return;
  const rows=await prisma.event.findMany({
    where:{EventsOnCommunicator:{some:{userId:actor(res)}}},
    include:{School:true,Bus:true,ExperimentSession:{include:{Experiment:true}}},
    orderBy:{eventDate:"desc"},take:200
  });
  res.json({rows});
});

fieldRouter.get("/trips", async (_req,res)=>{
  if(!allow(res,["DRIVER"],"field.trip.view")) return;
  const rows=await prisma.trip.findMany({
    where:{driverId:actor(res)},
    include:{Bus:true,Route:{include:{RouteStop:{include:{School:true},orderBy:{stopOrder:"asc"}}}}},
    orderBy:{scheduledDate:"desc"},take:200
  });
  res.json({rows});
});

fieldRouter.get("/lab", async (_req,res)=>{
  if(!allow(res,["SCIENCE_COMMUNICATOR","DRIVER"],"field.lab.view")) return;
  const uid=actor(res);
  if(role(res)==="DRIVER") {
    const bus=await prisma.bus.findUnique({
      where:{driverId:uid},
      include:{Equipment:true,BusMaintenanceRecord:true,GpsDevice:true}
    });
    if(!bus)return res.json({lab:null});
    return res.json({lab:bus});
  }
  if(role(res)==="SCIENCE_COMMUNICATOR") {
    const event=await prisma.event.findFirst({
      where:{EventsOnCommunicator:{some:{userId:uid}},eventDate:{gte:new Date()}},
      orderBy:{eventDate:"asc"}
    });
    if(!event)return res.json({lab:null});
    const bus=await prisma.bus.findUnique({where:{id:event.busId},include:{Equipment:true,BusMaintenanceRecord:true,GpsDevice:true}});
    return res.json({lab:bus});
  }
  return res.status(403).json({message:"Forbidden"});
});

fieldRouter.post("/events/:id/arrival", async (req,res)=>{
  if(!allow(res,["SCIENCE_COMMUNICATOR"],"field.session.execute")) return;
  const uid=actor(res);
  const event=await prisma.event.findFirst({where:{id:req.params.id,EventsOnCommunicator:{some:{userId:uid}}}});
  if(!event)return res.status(404).json({message:"Assigned visit not found"});
  const row=await prisma.event.update({where:{id:event.id},data:{status:"ON_SITE"}});
  await audit(req,res,"VISIT_ARRIVED","Event",row.id,{role:"SCIENCE_COMMUNICATOR"});
  res.json(row);
});

fieldRouter.post("/events/:id/start", async (req,res)=>{
  if(!allow(res,["SCIENCE_COMMUNICATOR"],"field.session.execute")) return;
  const uid=actor(res);
  const event=await prisma.event.findFirst({where:{id:req.params.id,EventsOnCommunicator:{some:{userId:uid}}}});
  if(!event)return res.status(404).json({message:"Assigned visit not found"});
  const row=await prisma.event.update({where:{id:event.id},data:{status:"ON_SITE"}});
  await audit(req,res,"SESSION_STARTED","Event",row.id);
  res.json(row);
});

fieldRouter.post("/events/:id/complete", async (req,res)=>{
  if(!allow(res,["SCIENCE_COMMUNICATOR"],"field.session.execute")) return;
  const uid=actor(res);
  const event=await prisma.event.findFirst({where:{id:req.params.id,EventsOnCommunicator:{some:{userId:uid}}}});
  if(!event)return res.status(404).json({message:"Assigned visit not found"});
  const row=await prisma.event.update({where:{id:event.id},data:{status:"COMPLETED"}});
  await audit(req,res,"VISIT_COMPLETED","Event",row.id);
  res.json(row);
});

fieldRouter.post("/attendance", async (req,res)=>{
  if(!allow(res,["SCIENCE_COMMUNICATOR"],"field.session.execute")) return;
  const parsed=z.object({eventId:z.string(),studentIds:z.array(z.string()),present:z.boolean().default(true)}).safeParse(req.body);
  if(!parsed.success)return res.status(400).json({message:"Invalid attendance payload"});
  const event=await prisma.event.findFirst({where:{id:parsed.data.eventId,EventsOnCommunicator:{some:{userId:actor(res)}}}});
  if(!event)return res.status(403).json({message:"Session is not assigned to you"});
  await prisma.$transaction(parsed.data.studentIds.map(studentId=>prisma.eventAttendance.upsert({
    where:{id:`${event.id}:${studentId}`},
    update:{isPresent:parsed.data.present,markedAt:new Date()},
    create:{id:`${event.id}:${studentId}`,eventId:event.id,studentId,isPresent:parsed.data.present}
  })));
  await audit(req,res,"ATTENDANCE_RECORDED","Event",event.id,{count:parsed.data.studentIds.length});
  res.json({ok:true});
});

fieldRouter.post("/consumption", async (req,res)=>{
  if(!allow(res,["SCIENCE_COMMUNICATOR"],"field.inventory.record")) return;
  const parsed=z.object({consumableId:z.string(),busId:z.string(),quantity:z.number().int().positive(),notes:z.string().optional()}).safeParse(req.body);
  if(!parsed.success)return res.status(400).json({message:"Invalid consumption payload"});
  const uid=actor(res);
  const event=await prisma.event.findFirst({where:{busId:parsed.data.busId,EventsOnCommunicator:{some:{userId:uid}},eventDate:{gte:new Date(new Date().setHours(0,0,0,0))}}});
  if(!event)return res.status(403).json({message:"Lab is not assigned to you"});
  const consumable=await prisma.consumable.findUnique({where:{id:parsed.data.consumableId}});
  if(!consumable || consumable.currentStock<parsed.data.quantity)return res.status(400).json({message:"Insufficient stock"});
  const tx=await prisma.$transaction(async db=>{
    const row=await db.inventoryTransaction.create({data:{id:newId(),consumableId:parsed.data.consumableId,busId:parsed.data.busId,quantity:parsed.data.quantity,type:"CONSUMPTION",performedById:uid,notes:parsed.data.notes,referenceType:"FIELD_SESSION",referenceId:event.id}});
    await db.consumable.update({where:{id:consumable.id},data:{currentStock:{decrement:parsed.data.quantity}}});
    return row;
  });
  await audit(req,res,"CONSUMABLE_CONSUMED","InventoryTransaction",tx.id,{eventId:event.id});
  res.status(201).json(tx);
});

fieldRouter.post("/issues", async(req,res)=>{
  if(!allow(res,["SCIENCE_COMMUNICATOR","DRIVER"],"field.issue.report"))return;
  const parsed=z.object({
    category:z.enum(["EQUIPMENT","INVENTORY","VEHICLE","SAFETY","TECHNICAL","SCHOOL_VISIT","OTHER"]),
    description:z.string().min(1),location:z.string().optional(),schoolId:z.string().optional(),busId:z.string().optional()
  }).safeParse(req.body);
  if(!parsed.success)return res.status(400).json({message:"Invalid issue payload"});
  const row=await prisma.operationalIssue.create({
    data:{
      id:newId(),
      category:parsed.data.category,
      description:parsed.data.description,
      location:parsed.data.location||undefined,
      schoolId:parsed.data.schoolId||undefined,
      busId:parsed.data.busId||undefined,
      reportedById:actor(res),
      regionId:res.locals.user.regionId||undefined
    }
  });
  await audit(req,res,"FIELD_ISSUE_REPORTED","OperationalIssue",row.id,{category:parsed.data.category});
  res.status(201).json(row);
});

fieldRouter.post("/trips/:id/start", async(req,res)=>{
  if(!allow(res,["DRIVER"],"field.trip.execute"))return;
  const trip=await prisma.trip.findFirst({where:{id:req.params.id,driverId:actor(res)}});
  if(!trip)return res.status(404).json({message:"Assigned trip not found"});
  const row=await prisma.trip.update({where:{id:trip.id},data:{status:"STARTED",startedAt:new Date()}});
  await prisma.bus.update({where:{id:trip.busId},data:{status:"ON_ROUTE"}});
  await audit(req,res,"TRIP_STARTED","Trip",row.id);
  res.json(row);
});

fieldRouter.post("/trips/:id/status", async(req,res)=>{
  if(!allow(res,["DRIVER"],"field.trip.execute"))return;
  const parsed=z.object({status:z.enum(["PLANNED","STARTED","IN_PROGRESS","COMPLETED","CANCELLED","EMERGENCY"])}).safeParse(req.body);
  if(!parsed.success)return res.status(400).json({message:"Invalid trip status"});
  const trip=await prisma.trip.findFirst({where:{id:req.params.id,driverId:actor(res)}});
  if(!trip)return res.status(404).json({message:"Assigned trip not found"});
  const data:any={status:parsed.data.status};
  if(parsed.data.status==="COMPLETED")data.completedAt=new Date();
  const row=await prisma.trip.update({where:{id:trip.id},data});
  if(parsed.data.status==="COMPLETED")await prisma.bus.update({where:{id:trip.busId},data:{status:"AVAILABLE"}});
  if(parsed.data.status==="EMERGENCY")await prisma.bus.update({where:{id:trip.busId},data:{status:"EMERGENCY"}});
  await audit(req,res,"TRIP_STATUS_UPDATED","Trip",row.id,{status:parsed.data.status});
  res.json(row);
});

fieldRouter.post("/trips/:id/gps", async(req,res)=>{
  if(!allow(res,["DRIVER"],"field.trip.execute"))return;
  const parsed=z.object({latitude:z.number(),longitude:z.number(),speedKmH:z.number().optional(),heading:z.number().optional()}).safeParse(req.body);
  if(!parsed.success)return res.status(400).json({message:"Invalid GPS payload"});
  const trip=await prisma.trip.findFirst({where:{id:req.params.id,driverId:actor(res)}});
  if(!trip)return res.status(404).json({message:"Assigned trip not found"});
  const row=await prisma.gPSPosition.create({data:{id:newId(),busId:trip.busId,tripId:trip.id,latitude:parsed.data.latitude,longitude:parsed.data.longitude,speedKmH:parsed.data.speedKmH,heading:parsed.data.heading,recordedAt:new Date(),isLive:true}});
  await prisma.bus.update({where:{id:trip.busId},data:{currentLat:parsed.data.latitude,currentLng:parsed.data.longitude,lastGpsUpdate:new Date(),status:"ON_ROUTE"}});
  res.status(201).json(row);
});

fieldRouter.post("/trips/:id/arrival", async(req,res)=>{
  if(!allow(res,["DRIVER"],"field.trip.execute"))return;
  const trip=await prisma.trip.findFirst({where:{id:req.params.id,driverId:actor(res)}});
  if(!trip)return res.status(404).json({message:"Assigned trip not found"});
  const stop=await prisma.routeStop.findFirst({where:{routeId:trip.routeId,status:"PENDING"},orderBy:{stopOrder:"asc"}});
  if(!stop)return res.status(400).json({message:"No pending stop"});
  const row=await prisma.routeStop.update({where:{id:stop.id},data:{status:"ARRIVED",actualArrival:new Date()}});
  await prisma.bus.update({where:{id:trip.busId},data:{status:"AT_SCHOOL"}});
  await audit(req,res,"SCHOOL_ARRIVAL","RouteStop",row.id);
  res.json(row);
});

fieldRouter.post("/trips/:id/departure", async(req,res)=>{
  if(!allow(res,["DRIVER"],"field.trip.execute"))return;
  const trip=await prisma.trip.findFirst({where:{id:req.params.id,driverId:actor(res)}});
  if(!trip)return res.status(404).json({message:"Assigned trip not found"});
  const stop=await prisma.routeStop.findFirst({where:{routeId:trip.routeId,status:"ARRIVED"},orderBy:{stopOrder:"asc"}});
  if(!stop)return res.status(400).json({message:"No arrived stop"});
  const row=await prisma.routeStop.update({where:{id:stop.id},data:{status:"DEPARTED",actualDeparture:new Date()}});
  await prisma.bus.update({where:{id:trip.busId},data:{status:"ON_ROUTE"}});
  await audit(req,res,"SCHOOL_DEPARTURE","RouteStop",row.id);
  res.json(row);
});

fieldRouter.post("/trips/:id/emergency", async(req,res)=>{
  if(!allow(res,["DRIVER"],"field.trip.execute"))return;
  const trip=await prisma.trip.findFirst({where:{id:req.params.id,driverId:actor(res)}});
  if(!trip)return res.status(404).json({message:"Assigned trip not found"});
  const issue=await prisma.operationalIssue.create({data:{id:newId(),category:"VEHICLE",description:String(req.body?.description||"Driver reported an emergency"),reportedById:actor(res),regionId:res.locals.user.regionId,busId:trip.busId}});
  await prisma.trip.update({where:{id:trip.id},data:{status:"EMERGENCY"}});
  await prisma.bus.update({where:{id:trip.busId},data:{status:"EMERGENCY"}});
  await audit(req,res,"EMERGENCY_REPORTED","Trip",trip.id,{issueId:issue.id});
  res.status(201).json({issue});
});

export default fieldRouter;
