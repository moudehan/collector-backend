import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CurrentUser } from 'src/auth/user.decorator';
import type { JwtUser } from 'src/auth/user.type';
import { ConversationMessageService } from './conversation-message.service';
import { ConversationService } from './conversation.service';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationController {
  constructor(
    private readonly convService: ConversationService,
    private readonly msgService: ConversationMessageService,
  ) {}

  @Get()
  getMyConversations(@CurrentUser() user: JwtUser) {
    return this.convService.findUserConversations(user.sub);
  }

  @Post('open')
  openConversation(
    @Body()
    body: {
      articleId: string;
      shopId: string;
      sellerId: string;
    },
    @CurrentUser() user: JwtUser,
  ) {
    return this.convService.findConversation(
      body.articleId,
      body.shopId,
      user.sub,
      body.sellerId,
    );
  }

  @Post('load-messages')
  loadMessages(@Body() body: { conversationId: string }) {
    return this.msgService.getMessages(body.conversationId);
  }

  @Post('messages/first')
  sendFirstMessage(
    @Body()
    body: {
      articleId: string;
      shopId: string;
      sellerId: string;
      content: string;
    },
    @CurrentUser() user: JwtUser,
  ) {
    return this.msgService.sendFirstMessage(
      body.articleId,
      body.shopId,
      user.sub,
      body.sellerId,
      body.content,
    );
  }

  @Post('messages')
  sendMessage(
    @Body()
    body: {
      conversationId: string;
      content: string;
    },
    @CurrentUser() user: JwtUser,
  ) {
    return this.msgService.sendMessageToConversation(
      body.conversationId,
      user.sub,
      body.content,
    );
  }

  @Get(':id')
  getConversationById(@Param('id') id: string) {
    return this.convService.findById(id);
  }
}
