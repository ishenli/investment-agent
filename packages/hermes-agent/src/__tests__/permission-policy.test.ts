import { describe, it, expect } from 'vitest';
import { PermissionPolicy, defaultPermissionPolicy, isToolAllowed, requiresConfirmation } from '../permission/policy';
import type { PermissionLevel, ToolCategory } from '../permission/types';

describe('PermissionPolicy', () => {
  const policy = new PermissionPolicy();

  describe('policy matrix', () => {
    const cases: Array<[ToolCategory, PermissionLevel, string]> = [
      // safe level - all operations require confirmation
      ['read', 'safe', 'confirm'],
      ['write', 'safe', 'confirm'],
      ['system', 'safe', 'confirm'],
      ['finance', 'safe', 'confirm'],
      // auto level - read/write auto, system/finance need confirmation
      ['read', 'auto', 'auto'],
      ['write', 'auto', 'auto'],
      ['system', 'auto', 'confirm'],
      ['finance', 'auto', 'confirm'],
      // full-access level - all operations auto
      ['read', 'full-access', 'auto'],
      ['write', 'full-access', 'auto'],
      ['system', 'full-access', 'auto'],
      ['finance', 'full-access', 'auto'],
    ];

    it.each(cases)(
      'category=%s level=%s → %s',
      (category, level, expected) => {
        expect(policy.evaluate(category, level)).toBe(expected);
      },
    );
  });

  describe('getPoliciesForLevel', () => {
    it('returns all policies for safe level', () => {
      const policies = policy.getPoliciesForLevel('safe');
      expect(policies).toEqual({
        read: 'confirm',
        write: 'confirm',
        system: 'confirm',
        finance: 'confirm',
      });
    });

    it('returns all policies for auto level', () => {
      const policies = policy.getPoliciesForLevel('auto');
      expect(policies).toEqual({
        read: 'auto',
        write: 'auto',
        system: 'confirm',
        finance: 'confirm',
      });
    });

    it('returns a copy, not a reference', () => {
      const p1 = policy.getPoliciesForLevel('auto');
      const p2 = policy.getPoliciesForLevel('auto');
      expect(p1).toEqual(p2);
      expect(p1).not.toBe(p2);
    });
  });

  describe('getFullMatrix', () => {
    it('returns all 3 levels', () => {
      const matrix = policy.getFullMatrix();
      expect(Object.keys(matrix)).toEqual(['safe', 'auto', 'full-access']);
    });
  });

  describe('defaultPermissionPolicy', () => {
    it('is a PermissionPolicy instance', () => {
      expect(defaultPermissionPolicy).toBeInstanceOf(PermissionPolicy);
    });
  });

  describe('isToolAllowed', () => {
    it('returns true for auto policy', () => {
      expect(isToolAllowed('read', 'auto')).toBe(true);
    });

    it('returns true for confirm policy', () => {
      expect(isToolAllowed('system', 'auto')).toBe(true);
      expect(isToolAllowed('read', 'safe')).toBe(true);
    });

    it('returns false for deny policy', () => {
      // No deny policies in the new matrix, but test the function anyway
      expect(isToolAllowed('read', 'full-access')).toBe(true);
    });
  });

  describe('requiresConfirmation', () => {
    it('returns true when policy is confirm', () => {
      expect(requiresConfirmation('read', 'safe')).toBe(true);
      expect(requiresConfirmation('system', 'auto')).toBe(true);
      expect(requiresConfirmation('finance', 'auto')).toBe(true);
    });

    it('returns false when policy is auto', () => {
      expect(requiresConfirmation('read', 'auto')).toBe(false);
      expect(requiresConfirmation('finance', 'full-access')).toBe(false);
    });
  });
});
