// Stream API role identifiers use underscores. Saflal only issues role:user
// tokens; call_member membership is assigned by the authorized Convex action.
export const STREAM_CALL_TYPE = "saflal_audio";
export const CLIENT_ROLES = ["user", "call_member", "guest", "anonymous"];
export const MEMBER_GRANTS = ["read-call", "join-call", "send-audio"];

export function restrictedGrants(name, existing = {}) {
  const grants = { ...existing };
  for (const role of CLIENT_ROLES) grants[role] = [];
  if (name === STREAM_CALL_TYPE) grants.call_member = [...MEMBER_GRANTS];
  return grants;
}

export function validStreamPolicy(types) {
  const audio = types?.[STREAM_CALL_TYPE];
  if (!audio) return false;
  for (const [name, config] of Object.entries(types)) {
    for (const role of CLIENT_ROLES) {
      const actual = config.grants?.[role] ?? [];
      const allowed = name === STREAM_CALL_TYPE && role === "call_member" ? MEMBER_GRANTS : [];
      if (!Array.isArray(actual) || actual.some(grant => !allowed.includes(grant))) return false;
      if (allowed.some(grant => !actual.includes(grant))) return false;
    }
  }
  const settings = audio.settings;
  return settings?.video?.enabled === false && settings?.screensharing?.enabled === false
    && settings?.backstage?.enabled === false && settings?.limits?.max_participants === 2
    && settings?.limits?.max_participants_exclude_owner !== true
    && !(settings?.limits?.max_participants_exclude_roles?.length);
}
