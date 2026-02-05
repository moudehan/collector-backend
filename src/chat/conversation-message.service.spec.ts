import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createMockRepository } from '../../test/utils/mock-repository';
import { ConversationMessageService } from './conversation-message.service';
import { ConversationMessage } from './conversation-message.entity';
import { Conversation } from './conversation.entity';
import { ConversationGateway } from './conversation.gateway';

describe('ConversationMessageService', () => {
  let service: ConversationMessageService;
  const msgRepo = createMockRepository<ConversationMessage>();
  const convRepo = createMockRepository<Conversation>();
  const gateway: Partial<ConversationGateway> = { emitNewMessage: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationMessageService,
        { provide: getRepositoryToken(ConversationMessage), useValue: msgRepo },
        { provide: getRepositoryToken(Conversation), useValue: convRepo },
        { provide: ConversationGateway, useValue: gateway },
      ],
    }).compile();

    service = module.get<ConversationMessageService>(
      ConversationMessageService,
    );
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('sendFirstMessage creates a conversation and message', async () => {
    (convRepo.findOne as jest.Mock).mockResolvedValueOnce(null);
    const createdConv: Partial<Conversation> = { id: 'c1' };
    (convRepo.create as jest.Mock).mockReturnValueOnce(
      createdConv as Conversation,
    );
    (convRepo.save as jest.Mock).mockResolvedValueOnce(
      createdConv as Conversation,
    );

    const createdMsg: Partial<ConversationMessage> = { id: 'm1' };
    (msgRepo.create as jest.Mock).mockReturnValueOnce(
      {} as ConversationMessage,
    );
    (msgRepo.save as jest.Mock).mockResolvedValueOnce(
      createdMsg as ConversationMessage,
    );

    const res = await service.sendFirstMessage('a', 's', 'b', 'sr', 'hello');

    expect(convRepo.create).toHaveBeenCalled();
    expect(msgRepo.save).toHaveBeenCalled();
    expect(gateway.emitNewMessage).toHaveBeenCalled();
    expect(res).toHaveProperty('conversation');
  });
});
