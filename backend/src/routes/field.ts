
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

  return res.status(403).json({message:"Field dashboard is only available to Science Communicators"});
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

fieldRouter.get("/lab", async (_req,res)=>{
  if(!allow(res,["SCIENCE_COMMUNICATOR"],"field.lab.view")) return;
  const uid=actor(res);
  const event=await prisma.event.findFirst({
    where:{EventsOnCommunicator:{some:{userId:uid}},eventDate:{gte:new Date()}},
    orderBy:{eventDate:"asc"}
  });
  if(!event)return res.json({lab:null});
  const bus=await prisma.bus.findUnique({where:{id:event.busId},include:{Equipment:true,BusMaintenanceRecord:true,GpsDevice:true}});
  return res.json({lab:bus});
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
  if(!allow(res,["SCIENCE_COMMUNICATOR"],"field.issue.report"))return;
  const parsed=z.object({
    category:z.enum(["EQUIPMENT","INVENTORY","VEHICLE","SAFETY","TECHNICAL","SCHOOL_VISIT","OTHER"]),
    description:z.string().min(1),location:z.string().optional(),schoolId:z.string().optional(),busId:z.string().optional()
  }).safeParse(req.body);
  if(!parsed.success)return res.status(400).json({message:"Invalid issue payload"});
  const row=await prisma.operationalIssue.create({data:{id:newId(),...parsed.data,reportedById:actor(res),regionId:res.locals.user.regionId||undefined}});
  await audit(req,res,"FIELD_ISSUE_REPORTED","OperationalIssue",row.id,{category:parsed.data.category});
  res.status(201).json(row);
});

export default fieldRouter;
