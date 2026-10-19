DRIVER



DRIVER PORTAL

│

├── Dashboard

│

├── My Schedule

│   ├── Today's Trips

│   ├── Upcoming Trips

│   ├── Assigned Route

│   └── Trip Details

│

├── Mobile Laboratory

│   ├── Lab Details

│   ├── Vehicle Details

│   ├── Pre-Trip Checklist

│   ├── Equipment Status

│   └── Vehicle / Lab Condition

│

├── Routes & Navigation

│   ├── Today's Route

│   ├── Route Details

│   ├── Navigation

│   ├── Stops

│   └── GPS / Location

│

├── Trip Management

│   ├── Start Trip

│   ├── Current Trip

│   ├── School Arrival

│   ├── School Departure

│   ├── Trip Status

│   └── End Trip

│

├── School Visits

│   ├── Today's Schools

│   ├── School Details

│   ├── Arrival / Departure

│   └── Visit History

│

├── Vehicle & Safety

│   ├── Vehicle Checklist

│   ├── Fuel / Charging

│   ├── Maintenance Issues

│   ├── Breakdown / Emergency

│   └── Safety Reports

│

├── Issues & Support

│   ├── Report Issue

│   ├── Vehicle Issue

│   ├── Route Issue

│   ├── Accident / Emergency

│   └── Contact Support

│

├── Trip Records

│   ├── Completed Trips

│   ├── Route History

│   ├── Distance / Travel Records

│   └── Submitted Reports

│

└── Profile

    ├── My Profile

    └── Account & Security





# DRIVER

## Driver Portal — Complete Functional Structure

The **Driver Portal** is the transportation and mobile-laboratory movement layer of the Science on Wheels platform. It allows the Driver to view assigned trips, operate the assigned mobile laboratory, follow planned routes, record movement and school arrival/departure, maintain vehicle safety information, and report transportation-related issues.

The Driver does not manage schools, schedules, experiments, staff assignments or inventory planning. Their primary responsibility is:

> **Prepare → Travel → Transport → Record → Report**



---



# DRIVER PORTAL

DRIVER PORTAL

│

├── Dashboard

│

├── My Schedule

│   ├── Today's Trips

│   ├── Upcoming Trips

│   ├── Assigned Route

│   └── Trip Details

│

├── Mobile Laboratory

│   ├── Lab Details

│   ├── Vehicle Details

│   ├── Pre-Trip Checklist

│   ├── Equipment Status

│   └── Vehicle / Lab Condition

│

├── Routes & Navigation

│   ├── Today's Route

│   ├── Route Details

│   ├── Navigation

│   ├── Stops

│   └── GPS / Location

│

├── Trip Management

│   ├── Start Trip

│   ├── Current Trip

│   ├── School Arrival

│   ├── School Departure

│   ├── Trip Status

│   └── End Trip

│

├── School Visits

│   ├── Today's Schools

│   ├── School Details

│   ├── Arrival / Departure

│   └── Visit History

│

├── Vehicle & Safety

│   ├── Vehicle Checklist

│   ├── Fuel / Charging

│   ├── Maintenance Issues

│   ├── Breakdown / Emergency

│   └── Safety Reports

│

├── Issues & Support

│   ├── Report Issue

│   ├── Vehicle Issue

│   ├── Route Issue

│   ├── Accident / Emergency

│   └── Contact Support

│

├── Trip Records

│   ├── Completed Trips

│   ├── Route History

│   ├── Distance / Travel Records

│   └── Submitted Reports

│

└── Profile

    ├── My Profile

    └── Account & Security



---



# 1. DASHBOARD

The **Driver Dashboard** is the Driver's operational home screen. It should provide only the information necessary for the Driver's current transportation responsibilities.

### Today's Overview

The dashboard should show:

- Today's assigned trip
- Assigned mobile laboratory
- Current route
- Next school
- Trip status
- Number of scheduled stops
- Current location
- Upcoming departure/arrival
- Vehicle alerts
- Open vehicle or route issues

For example:

Today's Trip



Laboratory: ML-002

Route: Nagpur → School A → School B

Next Stop: School A

Departure: 08:30 AM

Status: Travelling

### Current Trip

If a trip is active, the dashboard should prominently show:

Trip Status: IN PROGRESS

Current Location: —

Next Stop: School A

ETA: —

### Alerts

Relevant alerts may include:

- Vehicle issue
- Maintenance requirement
- Route change
- GPS unavailable
- Breakdown
- Emergency notification
- Schedule change
- School arrival/departure issue



---



# 2. MY SCHEDULE

The **My Schedule** section contains trips assigned to the Driver.



---



## 2.1 Today's Trips

The Driver should be able to view all trips scheduled for the current day.

Each trip can show:

- Mobile laboratory
- Departure time
- Route
- Stops
- First destination
- Number of stops
- Trip status

Example:

08:30 AM

ML-001

Route: Base → School A → School B

Status: Scheduled



---



## 2.2 Upcoming Trips

The Driver should be able to view future assigned trips.

Information includes:

- Date
- Departure time
- Laboratory
- Route
- Schools/stops
- Trip status

This allows the Driver to prepare for upcoming transportation duties.



---



## 2.3 Assigned Route

The Driver should be able to view the route associated with the selected trip.

The route may show:

Base

  ↓

School A

  ↓

School B

  ↓

School C

  ↓

Base

The Driver should be able to see the ordered stops and planned route.



---



## 2.4 Trip Details

Selecting a trip should open the complete trip information.

It may include:

- Trip date
- Departure time
- Mobile laboratory
- Driver
- Route
- Stops
- School destinations
- Expected arrival times
- Trip status
- Relevant instructions

The Driver uses this information to execute the assigned transportation activity.



---



# 3. MOBILE LABORATORY

This section provides the Driver with information about the mobile laboratory/vehicle assigned to them.

The Driver's responsibility is primarily to **operate and verify the assigned vehicle**, not to manage the organization's laboratory master data.



---



## 3.1 Lab Details

The Driver should be able to view:

- Laboratory ID
- Assigned vehicle
- Current operational status
- Assigned route
- Driver assignment
- Current destination
- Operational condition



---



## 3.2 Vehicle Details

The Driver should be able to view relevant vehicle information such as:

- Vehicle ID
- Registration information
- Vehicle type
- Assigned mobile laboratory
- Current condition/status
- Maintenance information



---



## 3.3 Pre-Trip Checklist

Before beginning a trip, the Driver should complete a pre-trip checklist.

The checklist may cover:

- Vehicle condition
- Tyres
- Brakes
- Lights
- Fuel/charge level
- GPS availability
- Required safety equipment
- Laboratory condition
- Visible damage
- Other required checks

The completed checklist should become part of the trip record.



---



## 3.4 Equipment Status

The Driver should be able to view the status of equipment relevant to transportation.

The Driver does not perform detailed scientific equipment management, but can identify visible transportation-related problems or discrepancies.

For example:

Equipment Loaded → Yes

Equipment Secured → Yes

Visible Damage → No

Any discrepancy can be reported to the appropriate operational authority.



---



## 3.5 Vehicle / Lab Condition

The Driver should be able to record the general condition of the mobile laboratory before and after trips.

This may include:

- Vehicle condition
- Laboratory exterior/interior condition
- Visible damage
- Safety condition
- Operational problems



---



# 4. ROUTES & NAVIGATION

The Routes & Navigation section supports the Driver while travelling.



---



## 4.1 Today's Route

Shows the route assigned for the current trip.

Example:

Mobile Laboratory

      ↓

Base

      ↓

School A

      ↓

School B

      ↓

School C

The Driver should be able to see:

- Current position
- Next stop
- Remaining stops
- Route status
- Destination



---



## 4.2 Route Details

Provides detailed information about the assigned route.

This may include:

- Starting location
- Destination
- Ordered stops
- Distance
- Estimated travel time
- Expected arrival
- Route status



---



## 4.3 Navigation

The Driver should be able to access navigation assistance for the assigned route.

Navigation should help the Driver:

- Reach the assigned school
- Follow planned stops
- Identify the next destination
- Handle route changes where supported



---



## 4.4 Stops

The Driver should be able to view every stop associated with the trip.

For example:

Stop 1 → School A

Stop 2 → School B

Stop 3 → School C

For each stop, the Driver may see:

- School
- Address/location
- Scheduled arrival
- Arrival status
- Departure status
- Stop status



---



## 4.5 GPS / Location

The system should capture relevant location information during transportation.

This can support:

- Current location
- Travel tracking
- Arrival verification
- Departure verification
- Route monitoring
- Travel history

The resulting location information can be used by the Regional Admin for operational monitoring.



---



# 5. TRIP MANAGEMENT

The **Trip Management** section records the actual movement of the mobile laboratory.



---



## 5.1 Start Trip

The Driver should be able to start an assigned trip.

Starting the trip can record:

- Trip start time
- Starting location
- Driver
- Laboratory
- Vehicle
- GPS state
- Initial checklist status

The trip then changes from:

Scheduled

    ↓

Started



---



## 5.2 Current Trip

During an active trip, the Driver should be able to view:

- Current location
- Current route
- Next stop
- Trip duration
- Trip status
- Remaining stops
- Navigation



---



## 5.3 School Arrival

When the mobile laboratory reaches a school, the Driver should be able to record arrival.

This can capture:

- Arrival time
- GPS/location
- School
- Trip
- Arrival status

The arrival record provides evidence that the mobile laboratory reached the planned destination.



---



## 5.4 School Departure

After the activities at the school are completed, the Driver should record departure.

This can capture:

- Departure time
- GPS/location
- School
- Trip
- Departure status



---



## 5.5 Trip Status

The Driver should be able to view the current operational state of the trip.

For example:

Scheduled

    ↓

Started

    ↓

Travelling

    ↓

At School

    ↓

Departed

    ↓

Travelling to Next Stop

    ↓

Completed

If an unexpected event occurs, the trip may also enter an issue-related state such as delayed or interrupted.



---



## 5.6 End Trip

After completing the final destination/return journey, the Driver should be able to end the trip.

The system can record:

- Trip end time
- Final location
- Final vehicle status
- Distance/travel information
- Issues reported
- Checklist/completion status

The trip then becomes part of the Driver's historical records.



---



# 6. SCHOOL VISITS

The School Visits section provides the Driver with information related to schools that form part of the assigned route.



---



## 6.1 Today's Schools

The Driver should be able to see all schools scheduled for the current trip.

Example:

Today's Schools



1\. ABC School

2\. XYZ School

3\. Government School

The Driver should be able to see the order in which the schools are scheduled.



---



## 6.2 School Details

The Driver should be able to view the information required to reach the school.

This may include:

- School name
- Location
- Address
- Scheduled arrival
- Scheduled departure
- Route information
- Visit status

The Driver does not manage the school's academic or administrative information.



---



## 6.3 Arrival / Departure

The Driver should be able to record:

School Arrival

      ↓

Activities at School

      ↓

School Departure

These timestamps become part of the visit/trip history.



---



## 6.4 Visit History

The Driver should be able to view previous school stops associated with their trips.

Information may include:

- School
- Visit date
- Arrival
- Departure
- Trip
- Route
- Issues



---



# 7. VEHICLE & SAFETY

This section focuses specifically on vehicle readiness and transportation safety.



---



## 7.1 Vehicle Checklist

The Driver should complete vehicle checks before operating the mobile laboratory.

The checklist can include:

- Brakes
- Tyres
- Lights
- Fuel/charge
- Steering
- Safety equipment
- GPS
- Vehicle condition
- Laboratory condition

The result should be stored with the relevant trip.



---



## 7.2 Fuel / Charging

The Driver should be able to record relevant fuel or charging information.

This may include:

- Starting fuel/charge
- Refuelling/charging
- Fuel/charge amount
- Date/time
- Ending fuel/charge
- Related trip

This creates a historical transportation record.



---



## 7.3 Maintenance Issues

The Driver should be able to report vehicle maintenance requirements.

Examples:

- Brake problem
- Tyre issue
- Engine problem
- Electrical problem
- GPS problem
- General maintenance requirement

The issue can then be forwarded to the appropriate Regional Admin/support workflow.



---



## 7.4 Breakdown / Emergency

If the vehicle becomes unusable during a trip, the Driver should have a mechanism to report the event.

The report should capture:

- Location
- Time
- Trip
- Vehicle
- Description
- Emergency status
- Evidence where applicable

The Regional Admin can then coordinate the appropriate response.



---



## 7.5 Safety Reports

The Driver should be able to record safety-related observations or incidents.

Examples:

- Unsafe vehicle condition
- Road incident
- Safety equipment problem
- Accident
- Other transportation safety concern



---



# 8. ISSUES & SUPPORT

The Issues & Support section allows the Driver to report transportation and operational problems.



---



## 8.1 Report Issue

The Driver should be able to create an issue directly from the current trip.

The issue can contain:

- Category
- Description
- Location
- Date/time
- Related trip
- Vehicle
- Evidence
- Status



---



## 8.2 Vehicle Issue

Used for vehicle-specific problems such as:

- Mechanical failure
- Tyre problem
- Brake problem
- Electrical issue
- Fuel/charging problem
- Other vehicle fault



---



## 8.3 Route Issue

Used for problems affecting the planned route.

Examples:

- Road blockage
- Route unavailable
- Traffic-related delay
- Incorrect destination information
- Navigation problem
- Route change



---



## 8.4 Accident / Emergency

Used for urgent incidents during transportation.

The Driver should be able to record:

- Incident type
- Location
- Time
- Description
- Related trip
- Vehicle
- Evidence
- Emergency status



---



## 8.5 Contact Support

Provides access to the appropriate operational support contact/process.

Depending on implementation, this can connect the Driver with:

- Regional Admin
- Operations support
- Vehicle maintenance support
- Emergency support



---



# 9. TRIP RECORDS

The Trip Records section provides the Driver with historical transportation records.



---



## 9.1 Completed Trips

The Driver should be able to view completed trips.

Information may include:

- Trip date
- Laboratory
- Route
- Schools
- Start time
- End time
- Trip status
- Issues



---



## 9.2 Route History

Provides historical routes travelled by the Driver.

Information includes:

- Date
- Route
- Stops
- Laboratory
- Route status
- Travel history



---



## 9.3 Distance / Travel Records

The system should maintain relevant travel information.

This may include:

- Distance travelled
- Trip duration
- Start location
- End location
- Stops
- Travel date

This information can contribute to operational and fleet analytics.



---



## 9.4 Submitted Reports

Shows reports submitted by the Driver.

Examples:

- Trip reports
- Vehicle reports
- Safety reports
- Maintenance reports
- Breakdown reports
- Route issue reports



---



# 10. PROFILE

The Profile section manages the Driver's own account information.



---



## 10.1 My Profile

The Driver should be able to view:

- Name
- Contact information
- Role
- Assigned region
- Assigned laboratory/vehicle
- Account status

Organization-level account information remains controlled by the appropriate administrator.



---



## 10.2 Account & Security

The Driver should have access to relevant personal account-security functions, such as:

- Account information
- Credential management where supported
- Session/security information
- Other permitted security actions

The Driver does not manage other users, roles or permissions.



---



# COMPLETE DRIVER OPERATING FLOW

The complete Driver workflow can be represented as:

DRIVER LOGIN

      ↓

DASHBOARD

      ↓

MY SCHEDULE

      ↓

View Assigned Trip

      ↓

MOBILE LABORATORY

      ↓

Check Vehicle / Lab / Pre-Trip Checklist

      ↓

ROUTES & NAVIGATION

      ↓

View Route / Navigate

      ↓

TRIP MANAGEMENT

      ↓

START TRIP

      ↓

Travel

      ↓

SCHOOL ARRIVAL

      ↓

School Stop

      ↓

SCHOOL DEPARTURE

      ↓

Next Stop

      ↓

...

      ↓

FINAL DESTINATION / RETURN

      ↓

END TRIP

      ↓

TRIP RECORDS

      ↓

Completed Trip / Travel History

### If an issue occurs

DRIVER

   ↓

Issue / Breakdown / Emergency

   ↓

ISSUES & SUPPORT

   ↓

Report Issue

   ↓

REGIONAL ADMIN / SUPPORT

   ↓

Resolution

   ↓

Trip Continues / Ends

   ↓

Recorded in Trip History

### Overall role relationship

SUPER ADMIN

     │

     │ Organization-wide control

     ▼

REGIONAL ADMIN

     │

     │ Plans regional operations

     │ Assigns labs / routes / trips

     ▼

DRIVER

     │

     │ Transportation execution

     │

     ├── Vehicle Preparation

     ├── Route Navigation

     ├── GPS / Travel

     ├── School Arrival

     ├── School Departure

     ├── Vehicle Safety

     └── Trip Records

     │

     ▼

OPERATIONAL DATA

     │

     ├── GPS

     ├── Routes

     ├── Trips

     ├── Arrival / Departure

     ├── Distance

     ├── Vehicle Condition

     └── Issues

     │

     ▼

REGIONAL ADMIN

     │

     │ Monitor / Resolve

     ▼

SUPER ADMIN

     │

     └── Organization-wide Analytics / Reports / Audit

**Key boundary:** The Driver is a **transportation-execution role**. The Driver operates the assigned mobile laboratory and records travel, arrival/departure, vehicle condition and transportation issues. The Driver does not create regional schedules, assign laboratories, manage Field Staff, modify schools or control curriculum and experiments.
