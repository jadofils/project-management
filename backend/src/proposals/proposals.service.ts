import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Proposal, ProposalVote, ProposalComment, User } from '../database/entities';

@Injectable()
export class ProposalsService {
  constructor(
    @InjectRepository(Proposal)        private proposals: Repository<Proposal>,
    @InjectRepository(ProposalVote)    private votes:     Repository<ProposalVote>,
    @InjectRepository(ProposalComment) private comments:  Repository<ProposalComment>,
    @InjectRepository(User)            private users:     Repository<User>,
  ) {}

  async create(authorId: string, dto: { title: string; description?: string; tags?: string[] }) {
    return this.proposals.save(this.proposals.create({
      author_id: authorId,
      title: dto.title.trim(),
      description: dto.description?.trim() || null,
      tags: dto.tags?.length ? dto.tags : null,
      status: 'open',
    } as any));
  }

  async getAll(userId: string, page = 1, limit = 20, status?: string) {
    const where: any = {};
    if (status && status !== 'all') where.status = status;
    const [data, total] = await this.proposals.findAndCount({
      where,
      order: { votes_for: 'DESC', created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const ids = data.map(p => p.id);
    const [userVotes, authors] = await Promise.all([
      ids.length ? this.votes.find({ where: ids.map(id => ({ proposal_id: id, user_id: userId })) }) : [],
      ids.length ? this.users.find({
        where: { id: In([...new Set(data.map(p => p.author_id))]) },
        select: ['id', 'first_name', 'last_name', 'avatar_url'],
      }) : [],
    ]);

    const voteMap   = Object.fromEntries(userVotes.map(v => [v.proposal_id, { vote: v.vote, reason: v.reason }]));
    const authorMap = Object.fromEntries(authors.map(u => [u.id, u]));

    return {
      data: data.map(p => ({ ...p, user_vote: voteMap[p.id] || null, author: authorMap[p.author_id] || null })),
      total, page, limit, totalPages: Math.ceil(total / limit),
    };
  }

  async vote(proposalId: string, userId: string, vote: 'for' | 'against', reason?: string) {
    const proposal = await this.proposals.findOne({ where: { id: proposalId } });
    if (!proposal) throw new NotFoundException('Proposal not found');

    const existing = await this.votes.findOne({ where: { proposal_id: proposalId, user_id: userId } });

    if (existing) {
      if (existing.vote === vote) {
        // Toggle off
        await this.votes.remove(existing);
        if (vote === 'for') await this.proposals.decrement({ id: proposalId }, 'votes_for', 1);
        else                await this.proposals.decrement({ id: proposalId }, 'votes_against', 1);
        return { action: 'removed' };
      }
      // Switch vote
      const old = existing.vote;
      existing.vote   = vote;
      existing.reason = reason || null;
      await this.votes.save(existing);
      if (old === 'for') {
        await this.proposals.decrement({ id: proposalId }, 'votes_for', 1);
        await this.proposals.increment({ id: proposalId }, 'votes_against', 1);
      } else {
        await this.proposals.decrement({ id: proposalId }, 'votes_against', 1);
        await this.proposals.increment({ id: proposalId }, 'votes_for', 1);
      }
      return { action: 'changed' };
    }

    await this.votes.save(this.votes.create({ proposal_id: proposalId, user_id: userId, vote, reason: reason || null } as any));
    if (vote === 'for') await this.proposals.increment({ id: proposalId }, 'votes_for', 1);
    else                await this.proposals.increment({ id: proposalId }, 'votes_against', 1);
    return { action: 'added' };
  }

  async getVotes(proposalId: string) {
    const votes = await this.votes.find({ where: { proposal_id: proposalId }, order: { created_at: 'ASC' } });
    const userIds = [...new Set(votes.map(v => v.user_id))];
    const users   = userIds.length
      ? await this.users.find({ where: { id: In(userIds) }, select: ['id', 'first_name', 'last_name', 'avatar_url'] })
      : [];
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));
    return votes.map(v => ({ ...v, user: userMap[v.user_id] || null }));
  }

  async addComment(proposalId: string, userId: string, content: string) {
    const comment = await this.comments.save(
      this.comments.create({ proposal_id: proposalId, user_id: userId, content: content.trim() } as any),
    );
    await this.proposals.increment({ id: proposalId }, 'comment_count', 1);
    const user = await this.users.findOne({ where: { id: userId }, select: ['id', 'first_name', 'last_name', 'avatar_url'] });
    return { ...comment, user };
  }

  async getComments(proposalId: string) {
    const comments = await this.comments.find({ where: { proposal_id: proposalId }, order: { created_at: 'ASC' } });
    const userIds  = [...new Set(comments.map(c => c.user_id))];
    const users    = userIds.length
      ? await this.users.find({ where: { id: In(userIds) }, select: ['id', 'first_name', 'last_name', 'avatar_url'] })
      : [];
    const userMap  = Object.fromEntries(users.map(u => [u.id, u]));
    return comments.map(c => ({ ...c, user: userMap[c.user_id] || null }));
  }

  async updateStatus(id: string, status: string, version_tag?: string) {
    const update: any = { status };
    if (version_tag !== undefined) update.version_tag = version_tag || null;
    await this.proposals.update(id, update);
    return this.proposals.findOne({ where: { id } });
  }

  async getChangelog() {
    const implemented = await this.proposals.find({
      where: { status: 'implemented' },
      order: { updated_at: 'DESC' },
    });
    const grouped: Record<string, typeof implemented> = {};
    for (const p of implemented) {
      const tag = p.version_tag || 'Untagged';
      if (!grouped[tag]) grouped[tag] = [];
      grouped[tag].push(p);
    }
    return Object.entries(grouped).map(([version, proposals]) => ({ version, proposals }));
  }
}
