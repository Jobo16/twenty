import {
  type ConversationArchiveMetadata,
  conversationRetentionStatus,
} from './conversation-archive-metadata';

const RETAINED_UNTIL = '2026-12-31T23:59:59.000Z';

const METADATA: Pick<
  ConversationArchiveMetadata,
  'retainedUntil' | 'deletedAt'
> = {
  retainedUntil: RETAINED_UNTIL,
  deletedAt: null,
};

describe('conversationRetentionStatus', () => {
  it('keeps content readable through the retention deadline', () => {
    expect(conversationRetentionStatus(METADATA, RETAINED_UNTIL)).toBe(
      'RETAINED',
    );
  });

  it('marks content expired once the deadline has passed', () => {
    expect(
      conversationRetentionStatus(METADATA, '2027-01-01T00:00:00.000Z'),
    ).toBe('EXPIRED');
  });

  it('marks content deleted even while the retention window is open', () => {
    expect(
      conversationRetentionStatus(
        { ...METADATA, deletedAt: '2026-10-01T00:00:00.000Z' },
        '2026-10-02T00:00:00.000Z',
      ),
    ).toBe('DELETED');
  });

  it('rejects a non ISO evaluation time', () => {
    expect(() => conversationRetentionStatus(METADATA, 'yesterday')).toThrow(
      'at must be an ISO timestamp',
    );
  });
});
