export const isExecutive = (user) => user.role === "Sales Executive";
export const isSeller = (user) => ["Sales Executive", "Team Lead"].includes(user.role);
export const canWorkAssigned = (user, record) =>
  !isSeller(user) || record.assigned === user.name;
export const canAccessAssigned = (user, record) =>
  !isExecutive(user) || record.assigned === user.name;

export const applyAssignmentScope = (user, query) => {
  if (isExecutive(user)) query.assigned = user.name;
  return query;
};
