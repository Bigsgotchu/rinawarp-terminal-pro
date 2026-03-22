// @ts-nocheck
import path from 'node:path';
import { readJsonIfExists } from '../shared/persistence.js';
export function createTeamAccess(deps) {
    const { fs, teamFile } = deps;
    function loadTeamDb() {
        return (readJsonIfExists(fs, teamFile()) ?? {
            workspaceId: '',
            currentUser: 'owner@local',
            members: [{ email: 'owner@local', role: 'owner' }],
            seatsAllowed: 1,
        });
    }
    function saveTeamDb(next) {
        const payload = {
            workspaceId: String(next?.workspaceId || ''),
            currentUser: String(next?.currentUser || 'owner@local'),
            members: Array.isArray(next?.members) && next.members.length > 0
                ? next.members.map((member) => ({
                    email: String(member?.email || '').trim().toLowerCase(),
                    role: normalizeRole(member?.role),
                }))
                : [{ email: 'owner@local', role: 'owner' }],
            seatsAllowed: Math.max(1, Number(next?.seatsAllowed || next?.members?.length || 1)),
        };
        fs.mkdirSync(path.dirname(teamFile()), { recursive: true });
        fs.writeFileSync(teamFile(), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
        return payload;
    }
    function normalizeRole(role) {
        const value = String(role || 'member').trim().toLowerCase();
        if (value === 'owner')
            return 'owner';
        if (value === 'admin' || value === 'operator')
            return 'admin';
        return 'member';
    }
    function getCurrentRole() {
        const team = loadTeamDb();
        const user = team.currentUser || 'owner@local';
        const role = team.members.find((m) => m.email === user)?.role;
        return normalizeRole(role || 'owner');
    }
    function roleRank(role) {
        const normalized = normalizeRole(role);
        if (normalized === 'owner')
            return 3;
        if (normalized === 'admin')
            return 2;
        return 1;
    }
    function hasRoleAtLeast(current, required) {
        return roleRank(current) >= roleRank(required);
    }
    return {
        loadTeamDb,
        saveTeamDb,
        normalizeRole,
        getCurrentRole,
        hasRoleAtLeast,
    };
}
