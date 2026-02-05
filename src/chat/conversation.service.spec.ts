import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createMockRepository } from '../../test/utils/mock-repository';
import { ConversationService } from './conversation.service';
import { Conversation } from './conversation.entity';
import { ConversationMessage } from './conversation-message.entity';
import { ConversationReadState } from './conversation-read-state.entity';

describe('ConversationService', () => {
  let service: ConversationService;
  const convRepo = createMockRepository<Conversation>();
  const msgRepo = createMockRepository<ConversationMessage>();
  const readStateRepo = createMockRepository<ConversationReadState>();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationService,
        { provide: getRepositoryToken(Conversation), useValue: convRepo },
        { provide: getRepositoryToken(ConversationMessage), useValue: msgRepo },
        {
          provide: getRepositoryToken(ConversationReadState),
          useValue: readStateRepo,
        },
      ],
    }).compile();

    service = module.get<ConversationService>(ConversationService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('findUserConversations should return empty when none found', async () => {
    (convRepo.find as jest.Mock).mockResolvedValueOnce([]);
    const res = await service.findUserConversations('u1');
    expect(res).toEqual([]);
  });

  it('findUserConversations should assemble conversations with hasUnread and lastMessageAt', async () => {
    const now = new Date();
    const convs: Conversation[] = [
      {
        id: 'c1',
        created_at: new Date(now.getTime() - 10000),
        buyerId: 'u1',
      } as Conversation,
    ];
    (convRepo.find as jest.Mock).mockResolvedValueOnce(convs);

    const messages: ConversationMessage[] = [
      {
        id: 'm1',
        conversation: { id: 'c1' } as Partial<Conversation>,
        created_at: new Date(now.getTime() - 9000),
        senderId: 'u1',
      } as ConversationMessage,
      {
        id: 'm2',
        conversation: { id: 'c1' } as Partial<Conversation>,
        created_at: new Date(now.getTime() - 5000),
        senderId: 'other',
      } as ConversationMessage,
    ];
    (msgRepo.find as jest.Mock).mockResolvedValueOnce(messages);

    (readStateRepo.find as jest.Mock).mockResolvedValueOnce([
      {
        conversationId: 'c1',
        userId: 'u1',
        lastReadAt: new Date(now.getTime() - 6000),
      },
    ]);

    const res = await service.findUserConversations('u1');
    expect(res).toHaveLength(1);
    expect(res[0].hasUnread).toBe(true);
    expect(res[0].lastMessageAt).toEqual(
      messages[messages.length - 1].created_at,
    );
  });

  it('findConversation and findById should return results when found', async () => {
    (convRepo.findOne as jest.Mock).mockResolvedValueOnce({ id: 'c1' });
    const r1 = await service.findConversation('a1', 's1', 'b1', 's2');
    expect(r1).toMatchObject({ id: 'c1' });

    (convRepo.findOne as jest.Mock).mockResolvedValueOnce({ id: 'c2' });
    const r2 = await service.findById('c2');
    expect(r2).toMatchObject({ id: 'c2' });
  });

  it('markConversationAsRead should update existing or create new', async () => {
    (readStateRepo.findOne as jest.Mock).mockResolvedValueOnce({
      id: 'rs1',
      conversationId: 'c1',
      userId: 'u1',
      lastReadAt: new Date(0),
      save: jest.fn(),
    });
    (readStateRepo.save as jest.Mock).mockResolvedValueOnce({ id: 'rs1' });
    await service.markConversationAsRead('c1', 'u1');
    expect(readStateRepo.save).toHaveBeenCalled();

    (readStateRepo.findOne as jest.Mock).mockResolvedValueOnce(null);
    (readStateRepo.create as jest.Mock).mockReturnValueOnce({
      conversationId: 'c1',
      userId: 'u1',
    });
    (readStateRepo.save as jest.Mock).mockResolvedValueOnce({
      id: 'rs2',
      conversationId: 'c1',
      userId: 'u1',
    });
    const created = await service.markConversationAsRead('c1', 'u1');
    expect(created).toMatchObject({ conversationId: 'c1', userId: 'u1' });
  });

  it('markConversationAsUnread should call delete', async () => {
    (readStateRepo.delete as jest.Mock).mockResolvedValueOnce(undefined);
    await service.markConversationAsUnread('c1', 'u1');
    expect(readStateRepo.delete).toHaveBeenCalledWith({
      conversationId: 'c1',
      userId: 'u1',
    });
  });
});
