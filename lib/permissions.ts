import { Role } from './db';

export function canProposeBudgetChange(role: Role): boolean {
  return role === 'admin' || role === 'manager';
}

export function canApproveBudgetChange(role: Role, requestedBy: number, userId: number): boolean {
  if (requestedBy === userId) return false;
  return role === 'admin' || role === 'manager' || role === 'artist';
}
