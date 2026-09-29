export const isExecutive = (user) => user.role === "Sales Executive";
export const canAccessAssigned = (user, record) =>
  !isExecutive(user) || record.assigned === user.name;

export const applyAssignmentScope = (user, query) => {
  if (isExecutive(user)) query.assigned = user.name;
  return query;
};
