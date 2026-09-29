export const isExecutive = (user) => user.role === "Sales Executive";
export const isLeader = (user) => user.role === "Team Leader";
export const canAccessAssigned = (user, record) =>
  !isExecutive(user) && !isLeader(user) ||
  (isExecutive(user) && record.assigned === user.name) ||
  (isLeader(user) && record.team === user.team);

export const applyAssignmentScope = (user, query) => {
  if (isExecutive(user)) query.assigned = user.name;
  if (isLeader(user)) query.team = user.team;
  return query;
};
