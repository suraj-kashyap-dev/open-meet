-- Open chat: remove the departments + cross-department chat-request subsystem.
-- Every user can DM any user; admin lists are no longer department-scoped.

ALTER TABLE "UserInvite" DROP COLUMN IF EXISTS "departmentIds";

DROP TABLE IF EXISTS "ChatAccessRequest";
DROP TABLE IF EXISTS "DepartmentMember";
DROP TABLE IF EXISTS "Department";

DROP TYPE IF EXISTS "ChatAccessRequestStatus";
