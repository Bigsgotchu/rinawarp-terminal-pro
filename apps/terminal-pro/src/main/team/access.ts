// @ts-nocheck
import { readJsonIfExists } from '../shared/persistence.js';
export function createTeamAccess(deps) {
    const { fs, teamFile } = deps;
    function loadTeamDb() {
        return (readJsonIfExists(fs, teamFile()) ?? {
            currentUser: 'owner@local',
            members: [{ email: 'owner@local', role: 'owner' }],
        });
    }
    function getCurrentRole() {
        const team = loadTeamDb();
        const user = team.currentUser || 'owner@local';
        const role = team.members.find((m) => m.email === user)?.role;
        return role || 'owner';
    }
    function roleRank(role) {
        if (role === 'owner')
            return 3;
        if (role === 'operator')
            return 2;
        return 1;
    }
    function hasRoleAtLeast(current, required) {
        return roleRank(current) >= roleRank(required);
    }
    return {
        loadTeamDb,
        getCurrentRole,
        hasRoleAtLeast,
    };
}
