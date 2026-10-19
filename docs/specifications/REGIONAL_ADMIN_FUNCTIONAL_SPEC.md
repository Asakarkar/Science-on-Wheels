REGIONAL ADMIN



REGIONAL ADMIN PORTAL

│

├── Dashboard

│

├── Regional Organization

│   ├── Region Overview

│   ├── Districts

│   ├── Blocks

│   └── Schools

│

├── People & Access

│   ├── Field Staff

│   ├── Staff Assignments

│   ├── Roles & Responsibilities

│   └── Staff Availability

│

├── Mobile Laboratories

│   ├── Assigned Labs

│   ├── Lab Details

│   ├── Lab Assignments

│   ├── Maintenance

│   ├── GPS / Location

│   └── Utilization

│

├── Schools

│   ├── School Directory

│   ├── Registration

│   ├── Verification

│   ├── Priority

│   └── School History

│

├── Curriculum & Experiments

│   ├── Classes

│   ├── Subjects

│   ├── Chapters

│   ├── Topics

│   ├── Learning Objectives

│   └── Experiments

│

├── Resources

│   ├── Equipment

│   ├── Consumables

│   ├── Inventory

│   ├── Maintenance

│   └── Resource History

│

├── Planning & Operations

│   ├── Visits

│   ├── Schedules

│   ├── Routes

│   ├── Assignments

│   ├── Sessions

│   └── Operational Issues

│

├── Monitoring

│   ├── Live Labs

│   ├── Today's Operations

│   ├── Alerts

│   ├── Activity

│   └── Field Status

│

├── Analytics & Reports

│   ├── Region

│   ├── Schools

│   ├── Labs

│   ├── Students

│   ├── Sessions

│   ├── Inventory

│   └── Staff

│

└── Records & Audit

    ├── Activity Logs

    ├── Session Records

    ├── Inventory Records

    ├── Staff Activity

    └── Operational History







# REGIONAL ADMINISTRATOR

## Regional Admin Portal — Complete Functional Structure

The **Regional Admin Portal** is the operational management layer of the Science on Wheels platform. It allows the Regional Administrator to manage schools, field staff, mobile laboratories, schedules, resources and day-to-day activities **within the assigned region**.

The Regional Administrator does not have organization-wide control. Their responsibility is primarily:

> **Plan → Assign → Coordinate → Monitor → Review**

The Regional Administrator receives the organization-level structure and master data configured by the Super Admin and uses it to manage regional operations.



---



# REGIONAL ADMIN PORTAL

REGIONAL ADMIN PORTAL

│

├── Dashboard

│

├── Regional Organization

│   ├── Region Overview

│   ├── Districts

│   ├── Blocks

│   └── Schools

│

├── People & Access

│   ├── Field Staff

│   ├── Staff Assignments

│   ├── Roles & Responsibilities

│   └── Staff Availability

│

├── Mobile Laboratories

│   ├── Assigned Labs

│   ├── Lab Details

│   ├── Lab Assignments

│   ├── Maintenance

│   ├── GPS / Location

│   └── Utilization

│

├── Schools

│   ├── School Directory

│   ├── Registration

│   ├── Verification

│   ├── Priority

│   └── School History

│

├── Curriculum & Experiments

│   ├── Classes

│   ├── Subjects

│   ├── Chapters

│   ├── Topics

│   ├── Learning Objectives

│   └── Experiments

│

├── Resources

│   ├── Equipment

│   ├── Consumables

│   ├── Inventory

│   ├── Maintenance

│   └── Resource History

│

├── Planning & Operations

│   ├── Visits

│   ├── Schedules

│   ├── Routes

│   ├── Assignments

│   ├── Sessions

│   └── Operational Issues

│

├── Monitoring

│   ├── Live Labs

│   ├── Today's Operations

│   ├── Alerts

│   ├── Activity

│   └── Field Status

│

├── Analytics & Reports

│   ├── Region

│   ├── Schools

│   ├── Labs

│   ├── Students

│   ├── Sessions

│   ├── Inventory

│   └── Staff

│

└── Records & Audit

    ├── Activity Logs

    ├── Session Records

    ├── Inventory Records

    ├── Staff Activity

    └── Operational History



---



# 1. DASHBOARD

The **Regional Dashboard** is the Regional Administrator's operational command center. It provides a real-time overview of activities occurring within the assigned region.

Unlike the Super Admin dashboard, which provides organization-wide visibility, the Regional Admin dashboard is restricted to the administrator's assigned region.

### Regional Overview

The dashboard should show:

- Total districts
- Total blocks
- Schools covered
- Active mobile laboratories
- Available Field Staff
- Students reached
- Today's visits
- Upcoming visits
- Completed sessions
- Pending sessions
- Inventory alerts
- Operational issues

These values should be generated from live operational data.

### Today's Operations

The Regional Admin should immediately see:

- Today's scheduled visits
- Assigned laboratories
- Assigned Field Staff
- Schools being visited
- Sessions in progress
- Completed sessions
- Delayed activities
- Cancelled activities

### Regional Lab Status

The dashboard should show the current state of laboratories assigned to the region.

For example:

ML-001 → Moving to School

ML-002 → At School

ML-003 → Returning

ML-004 → Under Maintenance

### Alerts

The dashboard should surface issues requiring regional attention, such as:

- Low inventory
- Equipment discrepancy
- Equipment damage
- Laboratory unavailable
- Missed visit
- Delayed session
- Vehicle issue
- Field Staff issue
- Synchronization problem
- School-related operational issue

The purpose is to allow the Regional Admin to act without manually checking every module.



---



# 2. REGIONAL ORGANIZATION

This section provides the Regional Administrator with the geographical and organizational structure of their assigned region.

The Regional Admin can view the hierarchy:

Region

   ↓

District

   ↓

Block

   ↓

School

The Regional Admin should not be able to modify organization-wide regional structure controlled by the Super Admin.



---



## 2.1 Region Overview

The Regional Admin should be able to view:

- Region name
- State
- Assigned Regional Administrator
- Number of districts
- Number of blocks
- Number of schools
- Assigned laboratories
- Field Staff
- Operational status
- Regional performance

This provides a consolidated view of the administrator's responsibility area.



---



## 2.2 Districts

The Districts section should provide a directory of districts within the assigned region.

For each district:

- District name
- Number of blocks
- Number of schools
- Schools covered
- Active laboratories
- Assigned Field Staff
- Visits
- Sessions
- Operational status

The Regional Admin should be able to select a district and drill down into its operational information.



---



## 2.3 Blocks

The Blocks section provides the next level of geographical organization.

For each block, the Regional Admin can view:

- Block name
- District
- Schools
- School status
- Scheduled visits
- Completed visits
- Pending activities
- Assigned Field Staff

This allows the Regional Admin to plan activities geographically.



---



## 2.4 Schools

The Regional Organization section should provide a regional-level school overview.

The Regional Admin should be able to:

- View schools
- Filter by district
- Filter by block
- View school status
- View coverage
- View operational history



---



# 3. PEOPLE & ACCESS

The People & Access section allows the Regional Admin to manage and coordinate **Field Staff within the assigned region**.

The Super Admin manages the organization's user accounts, roles and overall access structure. The Regional Admin handles operational assignment of Field Staff. The source specifically distinguishes organization-level account management from regional day-to-day staff assignment. Pasted markdown



---



## 3.1 Field Staff

The Regional Admin should be able to view Field Staff assigned to the region.

Information includes:

- Name
- Contact information
- Role
- Availability
- Assigned laboratory
- Current status
- Assigned visits
- Assigned sessions
- Operational activity

Possible statuses:

Available

Assigned

On Visit

On Session

Unavailable

On Leave

Inactive



---



## 3.2 Staff Assignments

The Regional Admin should manage operational assignments such as:

Field Staff

     ↓

Mobile Laboratory

     ↓

Visit

     ↓

School

     ↓

Session

The administrator should be able to:

- Assign staff to laboratories
- Assign staff to visits
- Assign staff to sessions
- Reassign staff
- View current assignments
- View upcoming assignments
- Identify assignment conflicts



---



## 3.3 Roles & Responsibilities

This section provides visibility into the responsibilities of staff working within the region.

The Regional Admin can view:

- Staff role
- Assigned responsibilities
- Laboratory assignment
- Operational duties
- Current assignments

Role definitions and organization-level permissions remain controlled centrally.



---



## 3.4 Staff Availability

The Regional Admin should be able to see staff availability for operational planning.

For example:

Field Staff A → Available

Field Staff B → On Visit

Field Staff C → On Leave

Field Staff D → Assigned to ML-003

This helps prevent assigning unavailable staff to visits or sessions.



---



# 4. MOBILE LABORATORIES

The Regional Admin manages laboratories **assigned to their region**.

The Super Admin has organization-wide laboratory visibility, while regional operations involve assigning and managing laboratory activities within the region. Pasted markdown



---



## 4.1 Assigned Labs

This provides the Regional Admin with a list of laboratories assigned to the region.

The list should show:

- Laboratory ID
- Laboratory status
- Assigned staff
- Current location
- Current school
- Next destination
- Maintenance status
- Utilization



---



## 4.2 Lab Details

Selecting a laboratory should open its complete regional operational profile.

This may include:

- Laboratory identity
- Vehicle information
- Assigned Field Staff
- Equipment
- Inventory
- Maintenance
- Current GPS
- Current route
- Current school
- Operational history



---



## 4.3 Lab Assignments

The Regional Admin should manage operational assignments involving the laboratories.

Examples:

Laboratory

    ↓

Field Staff

    ↓

School Visit

    ↓

Route

    ↓

Session

The administrator should be able to:

- Assign staff
- Assign visits
- Assign routes
- View laboratory availability
- Reassign operational work

Organization-level laboratory ownership or region transfer remains a Super Admin responsibility.



---



## 4.4 Maintenance

The Regional Admin should monitor laboratory maintenance requirements.

Information may include:

- Maintenance status
- Maintenance due date
- Service history
- Current condition
- Availability

If a laboratory becomes unavailable, the Regional Admin should be able to account for it during scheduling and assignment.



---



## 4.5 GPS / Location

The Regional Admin should be able to monitor laboratories operating within the region.

Information includes:

- Current location
- Last location update
- Movement status
- Current route
- Destination school
- Travel status
- Offline status
- Travel history

The GPS collection itself is handled by the underlying technical system; the portal displays the resulting location information. Pasted markdown



---



## 4.6 Utilization

The Regional Admin should be able to evaluate laboratory utilization.

Metrics include:

- Number of trips
- Number of sessions
- Operating hours
- Idle time
- Active/inactive status
- Visits completed

This helps identify underutilized or overloaded laboratories.



---



# 5. SCHOOLS

The Schools section is the Regional Admin's operational school directory.

The administrator should only see schools belonging to the assigned region.

A school connects:

School

  ↓

Registration

  ↓

Visits

  ↓

Sessions

  ↓

Students

  ↓

Experiments

  ↓

Feedback

  ↓

History



---



## 5.1 School Directory

The Regional Admin should be able to:

- Search schools
- Filter by district
- Filter by block
- Filter by status
- View school details
- View upcoming visits
- View past visits
- View operational history



---



## 5.2 Registration

The Regional Admin should be able to manage the regional school registration workflow.

Registration information may include:

- School details
- Student count
- Requested visit
- Preferred date/time
- Requested topics
- Infrastructure information
- Registration status



---



## 5.3 Verification

The Regional Admin should be able to review school registration information and process regional verification activities according to the defined workflow.

Possible states include:

Submitted

     ↓

Pending Verification

     ↓

Under Review

     ↓

Approved

or:

Changes Requested

Rejected

On Hold

The source confirms these registration/verification states exist in the intended data model. Pasted markdown



---



## 5.4 Priority

The Regional Admin should be able to view and use school priority information while planning regional operations.

Priority can consider:

- Priority category
- Priority score
- Factors
- Reason
- Manual override where permitted

This allows important schools to be scheduled appropriately rather than simply following registration order. Pasted markdown



---



## 5.5 School History

The Regional Admin should be able to view the complete history of a school.

School

  ↓

Previous Visits

  ↓

Sessions

  ↓

Experiments

  ↓

Students Reached

  ↓

Feedback

  ↓

Issues

  ↓

Future Visits

This gives the Regional Admin enough context to plan future activities.



---



# 6. CURRICULUM & EXPERIMENTS

The Regional Admin uses the centrally defined curriculum and experiment library for regional operations.

The hierarchy remains:

Class

  ↓

Subject

  ↓

Chapter

  ↓

Topic

  ↓

Learning Objective

  ↓

Experiment

The approved experiment definitions are controlled centrally by the Super Admin; Regional Admins should not modify the approved master experiment definitions. Pasted markdown



---



## 6.1 Classes

View the classes supported by the platform.

The Regional Admin can use class information while planning school visits and sessions.



---



## 6.2 Subjects

View available subjects and their associated curriculum.



---



## 6.3 Chapters

View chapters belonging to each subject.



---



## 6.4 Topics

View topics associated with chapters and subjects.



---



## 6.5 Learning Objectives

View the learning objectives associated with curriculum content.



---



## 6.6 Experiments

The Regional Admin should be able to:

- View approved experiments
- Filter by class
- Filter by subject
- Filter by topic
- View required equipment
- View required consumables
- View duration
- View safety requirements
- Select experiments for planned sessions

The operational relationship is:

SUPER ADMIN

     ↓

Approved Experiment Library

     ↓

REGIONAL ADMIN

     ↓

Selects Experiment for Visit

     ↓

FIELD STAFF

     ↓

Executes Experiment

     ↓

SESSION RECORD

This separation is explicitly reflected in the source architecture. Pasted markdown



---



# 7. RESOURCES

The Resources section allows the Regional Admin to manage and monitor resources available within the region.

The system distinguishes between master definitions, physical equipment and inventory transactions. Pasted markdown



---



## 7.1 Equipment

The Regional Admin should be able to view equipment assigned to regional laboratories.

Information includes:

- Equipment name
- Equipment ID
- Category
- Laboratory
- Condition
- Availability
- QR/Barcode
- Maintenance status



---



## 7.2 Consumables

The Regional Admin should monitor consumable resources.

Information includes:

- Item
- Category
- Unit
- Current stock
- Minimum stock
- Reorder level
- Status



---



## 7.3 Inventory

Regional inventory should provide visibility into:

Laboratory

    ↓

Item

    ↓

Opening Stock

    ↓

Receipts

    ↓

Transfers

    ↓

Consumption

    ↓

Adjustments

    ↓

Current Stock

The Regional Admin should be able to:

- View stock
- Monitor low-stock items
- Review transfers
- Review consumption
- Review adjustments
- Identify shortages
- Coordinate resource allocation

The underlying system supports transactions such as receipt, issue, return, transfer, adjustment, damage, loss and consumption. Pasted markdown



---



## 7.4 Maintenance

The Regional Admin should monitor maintenance requirements for regional resources.

This may include:

- Maintenance date
- Calibration date
- Warranty
- Condition
- Replacement status



---



## 7.5 Resource History

The Regional Admin should be able to trace important resource movements.

Example:

Equipment

    ↓

Assigned to Lab A

    ↓

Transferred

    ↓

Verified

    ↓

Damaged

    ↓

Maintenance

This provides accountability for regional physical resources.



---



# 8. PLANNING & OPERATIONS

This is the **core operational section** of the Regional Admin Portal.

It converts available schools, laboratories, staff, routes and experiments into actual field operations.



---



## 8.1 Visits

A visit connects:

School

   +

Date / Time

   +

Laboratory

   +

Field Staff

   +

Class

   +

Approved Experiments

   +

Route

The Regional Admin should be able to:

- Create visits
- View visits
- Edit visits
- Assign laboratories
- Assign Field Staff
- Select experiments
- Reschedule visits
- Cancel visits
- Track completion



---



## 8.2 Schedules

The Regional Admin is responsible for normal regional scheduling.

The schedule should show:

- Today's visits
- Upcoming visits
- Completed visits
- Pending visits
- Delayed visits
- Cancelled visits
- School
- Laboratory
- Field Staff
- Time
- Status

This is one of the key differences from the Super Admin, who primarily monitors schedules organization-wide. Pasted markdown



---



## 8.3 Routes

Routes connect laboratories to their planned school visits.

The Regional Admin should be able to:

- View planned routes
- Assign routes to laboratories
- View ordered school stops
- Monitor route progress
- Review route distance
- Review estimated travel time
- Identify route-related issues

The route structure is:

Route

  ↓

Mobile Laboratory

  ↓

Stop 1

  ↓

Stop 2

  ↓

Stop 3



---



## 8.4 Assignments

This section manages operational assignments.

Examples:

School → Visit

Lab → Visit

Staff → Visit

Experiment → Session

Route → Lab

The Regional Admin should be able to create, modify and review these operational assignments while respecting staff and laboratory availability.



---



## 8.5 Sessions

A session represents the actual educational activity conducted at the school.

Its operational lifecycle is:

Scheduled

    ↓

Traveling

    ↓

Arrived

    ↓

In Progress

    ↓

Completed

    ↓

Synced

The Regional Admin monitors session progress and reviews the resulting records rather than performing the field recording itself. Pasted markdown



---



## 8.6 Operational Issues

The Regional Admin should receive and manage operational issues raised from the field.

Examples:

- Equipment issue
- Inventory issue
- Vehicle issue
- Safety issue
- Technical issue
- School/visit issue
- Other operational issue

Each issue should contain:

- Reported By
- Category
- Description
- Location
- Timestamp
- Evidence
- Status
- Assigned Resolver
- Resolution

This allows the Regional Admin to coordinate resolution within the region. The Super Admin can subsequently view the organization-wide issue picture. Pasted markdown



---



# 9. MONITORING

The Monitoring section provides the Regional Admin with a **live view of ongoing regional operations**.



---



## 9.1 Live Labs

Shows the current status of regional laboratories:

Moving

At School

Returning

Offline

Under Maintenance

Available

The exact status values can be finalized during implementation.



---



## 9.2 Today's Operations

Provides a live operational summary of the current day.

The Regional Admin should be able to see:

- Visits scheduled today
- Visits completed
- Visits pending
- Sessions in progress
- Labs currently travelling
- Labs at schools
- Staff currently active
- Delayed operations



---



## 9.3 Alerts

The Regional Admin should receive regional operational alerts.

Examples:

Low Inventory

      ↓

Regional Alert

Lab Offline

      ↓

Regional Alert

Equipment Discrepancy

      ↓

Regional Alert

Missed Visit

      ↓

Regional Alert



---



## 9.4 Activity

Provides a chronological operational activity feed.

Examples:

- Visit created
- Staff assigned
- Lab assigned
- Session started
- Session completed
- Inventory transferred
- Equipment issue reported
- Visit rescheduled
- Issue resolved

This provides operational visibility without replacing the formal audit records.



---



## 9.5 Field Status

The Regional Admin should be able to understand the current status of Field Staff.

For example:

Field Staff A → On Visit

Field Staff B → Available

Field Staff C → In Session

Field Staff D → Offline

This helps the Regional Admin respond to operational changes and reassign work when required.



---



# 10. ANALYTICS & REPORTS

The Regional Analytics section converts operational records into **region-specific insights**.

The data should be generated from the operational database rather than manually maintained figures. Pasted markdown



---



## 10.1 Region Analytics

Shows the overall performance of the assigned region.

Metrics may include:

- Schools covered
- Students reached
- Visits
- Sessions
- Laboratory utilization
- Staff activity
- Inventory consumption
- Experiments conducted



---



## 10.2 School Analytics

Shows:

- Schools visited
- Pending schools
- Visit frequency
- Students reached
- Session history
- Engagement
- Feedback



---



## 10.3 Laboratory Analytics

Shows:

- Trips
- Sessions
- Operating hours
- Idle time
- Utilization
- Maintenance
- Route activity



---



## 10.4 Student Analytics

Shows student reach and participation information collected within the region.

Possible metrics:

- Total students reached
- Students by school
- Students by class
- Attendance
- Session participation



---



## 10.5 Session Analytics

Shows:

- Completed sessions
- Pending sessions
- Completion rate
- Session duration
- Attendance
- Experiments conducted
- Issues



---



## 10.6 Inventory Analytics

Shows:

- Current stock
- Consumption
- Low-stock items
- Transfers
- Damage/loss
- Resource utilization



---



## 10.7 Staff Analytics

Shows operational activity of Field Staff within the region:

- Visits
- Sessions
- Completion
- Attendance recording
- Reported issues
- Assigned workload



---



## 10.8 Reports

The Regional Admin should be able to generate reports such as:

- Regional Report
- School Report
- Laboratory Report
- Session Report
- Student Reach Report
- Attendance Report
- Experiment Report
- Equipment Report
- Inventory Report
- Staff Activity Report
- Monthly Regional Report

Export formats can include:

**PDF / Excel / CSV**

The Super Admin can subsequently use aggregated regional information for organization-wide reporting. Pasted markdown



---



# 11. RECORDS & AUDIT

The Records & Audit section provides the Regional Admin with historical records required for operational accountability.

The Regional Admin should have access only to records within the appropriate regional scope and permissions.



---



## 11.1 Activity Logs

Provides a chronological record of important regional operational actions.

Examples:

- Visit created
- Visit modified
- Staff assigned
- Lab assigned
- Session completed
- Inventory transferred
- Issue reported
- Issue resolved



---



## 11.2 Session Records

Provides historical records of completed educational sessions.

Each session record may contain:

- School
- Date
- Laboratory
- Field Staff
- Class
- Experiment
- Attendance
- Duration
- Observations
- Issues
- Feedback
- Synchronization status



---



## 11.3 Inventory Records

Provides historical inventory transactions.

Examples:

- Receipt
- Issue
- Return
- Transfer
- Consumption
- Adjustment
- Damage
- Loss

This allows the Regional Admin to trace how regional resources have moved and been consumed. Pasted markdown



---



## 11.4 Staff Activity

Shows operational activity performed by Field Staff.

Examples:

- Visits handled
- Sessions completed
- Attendance recorded
- Issues reported
- Assigned laboratories
- Completed tasks



---



## 11.5 Operational History

Provides a consolidated historical view of regional operations.

This can connect:

School

  ↓

Visit

  ↓

Laboratory

  ↓

Field Staff

  ↓

Session

  ↓

Attendance

  ↓

Experiment

  ↓

Inventory

  ↓

Issues

  ↓

Feedback

This gives the Regional Admin a complete historical picture of what happened in the region.



---



# COMPLETE REGIONAL ADMIN OPERATING FLOW

All sections of the Regional Admin Portal connect into one operational workflow:

REGIONAL ADMIN LOGIN

        ↓

REGIONAL ORGANIZATION

        ↓

Understand Region / Districts / Blocks / Schools

        ↓

PEOPLE & ACCESS

        ↓

Check Field Staff & Availability

        ↓

MOBILE LABORATORIES

        ↓

Check Labs / Resources / Availability

        ↓

SCHOOLS

        ↓

Review / Verify / Prioritize Schools

        ↓

CURRICULUM & EXPERIMENTS

        ↓

Select Approved Experiments

        ↓

PLANNING & OPERATIONS

        ↓

Create Visits / Schedules / Routes / Assignments

        ↓

FIELD STAFF

        ↓

Execute Visit / Session

        ↓

MONITORING

        ↓

Track Labs / Staff / Sessions / Alerts

        ↓

ANALYTICS & REPORTS

        ↓

Evaluate Regional Performance

        ↓

RECORDS & AUDIT

        ↓

Maintain Operational History

And the **overall relationship between the three operational levels** is:

                   SUPER ADMIN

                         │

                         │

          Organization-wide configuration

          Users / Master Data / Policies

                         │

                         ▼

                  REGIONAL ADMIN

                         │

                         │

          Regional planning & coordination

          Schools / Labs / Staff / Visits

                         │

                         ▼

                   FIELD STAFF

                         │

                         │

                 Field execution

                         │

                         ▼

                OPERATIONAL DATA

                         │

          ┌──────────────┼──────────────┐

          ▼              ▼              ▼

       Sessions       Inventory        GPS

          │              │              │

          ├──────────────┼──────────────┤

          ▼              ▼              ▼

       Attendance     Equipment       Issues

                         │

                         ▼

                  REGIONAL ADMIN

                         │

                    Review / Resolve

                         │

                         ▼

                    SUPER ADMIN

                         │

              Global Monitoring

              Analytics / Reports

              Security / Audit

**Key boundary:** The Regional Admin operates **within the assigned region**. Organization-level configuration, creation of Regional Administrator accounts, central roles/permissions, approved master curriculum and organization-wide control remain with the Super Admin. This separation is consistent with the supplied Super Admin specification. Pasted markdown Pasted markdown
