# To Initialize the application we have to create the SiteRoot, AdminRoot, each and every Site, and at least one Administrator user for the client to log in and starts working (that admin will be able to create more users)

## --- What are the AdminRoot and the SiteRoot ? ---

They are HealthCareParty objects that are meant to be on the very top of the data structure.

When creating objects such a a calendarItem or a Patient (which is an end user/citizen in our case), we need to share them with the AdminRoot.
When creating an Administrator, we have to place him as a child of the AdminRoot.
This allows the Administrators to have visibility over everything.

Likewise, when creating objects such as Patient, we also have to share it with the SiteRoot.
When we create Site objects, we place them as children of the SiteRoot.
This allows the City_Workers to have visibility over them as well.

We have to create adminRoot and siteRoot using the addAdminRoot.ts and the addSiteRoot.ts scripts.

## --- What is a Site ? ---

A Site is a HealthCareParty that represents a geographical place in the real world. In our application, the Mouscron client can receive citizens in different geographical places, and those are our Site objects.
We have to create every Site at the app setup using the addSite.ts script.
Make sure to modify the site Name and make sure the groupID is the correct one (icure database)

Each Site object need to have their keys initialized. For now and as a workaround, we will connect to the application through the site.
For that we just need to input a valid email when creating the site and use it to log.
Once logged, the keys are initialized and you can directly log out.

## --- What is an Administrator user ? ---

It's someone who can see and do everything in the application, including creating other users.
So we will create a first administrator for the client, and they will then be able to handle everything else themselves.
We have to create a first administrator using the addAdmin.ts script.

## --- What about permissions ? ---

See below for the list of permissions and how to handle roles.
The basics is that we have created custom roles ('ADMINISTRATOR', 'HEAD_OF_SERVICE', 'CITY_WORKER') and attached custom set of permissions to them
When creating an Administrator, we give gim the Adminisrator set of permissions.

## Order of things :

1. Add adminRoot and siteRoot
2. Add all the Sites
3. Connect with each Site
4. Add an administrator

## How to use the scripts ?

From the root of the project you can use
npx ts-node --transpile-only -P tsconfig.scripts.json src/scripts/getAdminRoot.ts

Before running, fill in the credentials and config values in `src/scripts/utils.ts` (`ADMIN_SOLUTIONS_EMAIL`, `ADMIN_SOLUTIONS_AUTH_TOKEN`, `ICURE_NIGHTLY_URL`, `ICURE_API_URL`, `DATABASE_ID`).
Don't forget to modify the variables inside the script you wish to run, and revert `utils.ts` after running to avoid committing credentials.

# Permissions and roles :

To fetch all possible permissions :
curl -X POST https://api.icure.cloud/rest/v2/aa/icure/permissions

Roles endpoints :
POST https://api.icure.cloud/rest/v2/role/{roleName} with body being a json array of the permission name string (e.g. "UserManagement.Delete.Patient") to create a role
GET https://api.icure.cloud/rest/v2/role/{roleID} to get back the role you created
GET https://api.icure.cloud/rest/v2/role/inGroup/{groupId} to get all the roles available in that group (including the builtin roles)
PUT https://api.icure.cloud/rest/v2/role/{roleID} with body being a json array of the permission name string (e.g. "UserManagement.Delete.Patient") to update the permissions of an existing role
DELETE https://api.icure.cloud/rest/v2/role/{roleID} to delete a role
POST https://api.icure.cloud/rest/v2/user/{userId}/inGroup/{groupId}/roles/set to set the roles of a user (cockpit won’t work with custom roles) - the body must be { "ids": [role1, role2, …] }

Existing roles :

- Administrator
- Head of service
- City Worker

# Emails

## All variables

variables: [
    "firstName",
    "lastName",
    "group",
    "from",
    "mobilePhone",
    "email",
    "validationCode",
    "hcpId",
    "url",
    "date",
    "time",
    "location",
    "service",
    "procedure",
    "procedureDetails"
]

## Create an Email process

Use this to make a email process. The html body goes in the body, and don't forget to use the variables. It returns a processID that we need to stock in order to use them later in the frontend to send the actual email.
The JWT token needed can be found when making a request on the cockpit. It needs to be the jwt of the global admin

curl --request POST \
 --url 'https://msg-gw.icure.cloud/ic-omarech-61494b71-2d10-4279-8bbc-8f776f012000/process/template/ec7d9b00-948c-11f0-a83d-fffe07e305e2/ic-taktikticketingagendamouscron-f7627de4-d674-4443-9987-2cc5c0d793b1?language=fr' \
 --header 'Authorization: Bearer $JWT' \
 --header 'content-type: application/json' \
 --data '{
"subject": "your subject {{ name }}",
"body": "body {{ firstName }}"
}'

In the url we have the msg-gw.icure.cloud/{process_id}/process/template/{template_id}/{db_id}?language={language}

## Send an email

Use this to send an email. Receiver is the email we are sending to. From is the email sending it. Process Id is the specific email we created in the precedent step.
Don't forget to use the variables.
The JWT needs to be an authentified account (patient should/may work. To test.)

curl --request POST \
 --url https://msg-gw.icure.cloud/ic-omarech-61494b71-2d10-4279-8bbc-8f776f012000/email/to/{receiver} \
 --header 'Authorization: Bearer $JWT' \
 --header 'content-type: application/json' \
 --data '{
"from": "no-reply@mouscron.be",
"processId": "ID",
"variables": {
"lastName": "Pierro"
}
}'
