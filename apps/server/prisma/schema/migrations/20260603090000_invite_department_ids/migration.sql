-- Invited users join these departments on accept (assigned by the inviting admin).
ALTER TABLE "UserInvite" ADD COLUMN "departmentIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
