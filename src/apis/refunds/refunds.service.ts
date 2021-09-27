import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Any, Repository } from 'typeorm';

import {
  OrderItem,
  OrderStatus,
} from 'src/apis/orders/entities/order-item.entity';
import { User, UserRole } from 'src/apis/users/entities/user.entity';
import {
  RefundProductInput,
  RefundProductOutput,
} from './dtos/refund-product.dto';
import {
  GetRefundsFromConsumerInput,
  GetRefundsFromConsumerOutput,
} from './dtos/get-refunds-from-consumer.dto';
import { Refund, RefundStatus } from './entities/refund.entity';
import {
  GetRefundsFromProviderInput,
  GetRefundsFromProviderOutput,
} from './dtos/get-refunds-from-provider.dto';
import { formmatDay } from 'src/utils/dayUtils';

@Injectable()
export class RefundsService {
  constructor(
    @InjectRepository(Refund)
    private readonly refunds: Repository<Refund>,

    @InjectRepository(OrderItem)
    private readonly orderItems: Repository<OrderItem>,

    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async requestRefund(
    refundProductInput: RefundProductInput,
    user: User,
  ): Promise<RefundProductOutput> {
    try {
      if (user.role !== UserRole.Consumer) {
        return {
          ok: false,
          error: '환불할 수 없습니다.',
        };
      }

      if (
        refundProductInput.status == RefundStatus.Exchanged &&
        refundProductInput.refundPay &&
        !!!refundProductInput.sendDay &&
        !!!refundProductInput.sendPlace
      ) {
        return {
          ok: false,
          error: '교환 신청을 하셨습니다.',
        };
      } else if (
        refundProductInput.status == RefundStatus.Refunded &&
        refundProductInput.sendDay &&
        refundProductInput.sendPlace &&
        !!!refundProductInput.refundPay
      ) {
        return {
          ok: false,
          error: '환불 신청을 하셨습니다.',
        };
      }

      const orderItem = await this.orderItems.findOne({
        where: {
          id: refundProductInput.orderItemId,
        },
      });

      if (!orderItem) {
        return {
          ok: false,
          error: '해당 품목에 대한 주문이 없습니다.',
        };
      }

      if (
        orderItem.status === OrderStatus.Exchanged ||
        orderItem.status === OrderStatus.Refunded
      ) {
        return {
          ok: false,
          error: '이미 교환이나 환불을 하셨습니다.',
        };
      }

      const refund = await this.refunds.save(
        this.refunds.create({
          ...refundProductInput,
          refundee: user,
          orderItem,
          refundedAt: '',
        }),
      );

      const refundedAt = formmatDay(refund.createdAt);

      refund.refundedAt = refundedAt;
      await this.refunds.save(refund);

      if (refundProductInput.status === RefundStatus.Exchanged) {
        orderItem.status = OrderStatus.Exchanged;
      } else if (refundProductInput.status === RefundStatus.Refunded) {
        orderItem.status = OrderStatus.Refunded;
      }

      await this.orderItems.save(orderItem);

      return {
        ok: true,
        orderItem,
      };
    } catch (error) {
      console.error(error);
      return {
        ok: false,
        error: '교환이나 환불을 할 수 없습니다.',
      };
    }
  }

  async getRefundsFromConsumer({
    page = 1,
    consumerId,
  }: GetRefundsFromConsumerInput): Promise<GetRefundsFromConsumerOutput> {
    try {
      const consumer = await this.users.findOne({
        id: consumerId,
      });

      if (!consumer) {
        return {
          ok: false,
          error: '고객이 존재하지 않습니다.',
        };
      }

      const takePages = 10;
      const [refundItems, totalRefundItems] = await this.refunds.findAndCount({
        where: {
          refundee: consumer,
        },
        skip: (page - 1) * takePages,
        take: takePages,
        order: {
          createdAt: 'DESC',
        },
        relations: ['orderItem', 'orderItem.product'],
      });
      return {
        ok: true,
        refundItems,
        totalPages: Math.ceil(totalRefundItems / takePages),
        totalResults:
          takePages * page < totalRefundItems
            ? takePages * page
            : totalRefundItems,
        nextPage: takePages * page < totalRefundItems ? page + 1 : null,
        hasNextPage: takePages * page <= totalRefundItems ?? false,
        prevtPage: page <= 1 ? null : page - 1,
        hasPrevtPage: page <= 1 ? false : true,
      };
    } catch (error) {
      console.error(error);
      return {
        ok: false,
        error: '교환이나 환불된 주문 목록을 찾을 수가 없습니다.',
      };
    }
  }

  async getRefundsFromProvider({
    page = 1,
    providerId,
  }: GetRefundsFromProviderInput): Promise<GetRefundsFromProviderOutput> {
    try {
      const provider = await this.users.findOne({
        id: providerId,
      });

      if (!provider) {
        return {
          ok: false,
          error: '공급자가 존재하지 않습니다.',
        };
      }

      const takePages = 10;
      const [orderItems, totalOrderItems] = await this.orderItems.findAndCount({
        where: [
          {
            product: {
              provider,
            },
            status: Any([
              OrderStatus.Canceled,
              OrderStatus.Exchanged,
              OrderStatus.Refunded,
            ]),
          },
        ],
        skip: (page - 1) * takePages,
        take: takePages,
        relations: ['product', 'product.provider', 'product.category', 'order'],
        order: {
          createdAt: 'ASC',
        },
      });

      return {
        ok: true,
        orderItems,
        totalPages: Math.ceil(totalOrderItems / takePages),
        totalResults:
          takePages * page < totalOrderItems
            ? takePages * page
            : totalOrderItems,
        nextPage: takePages * page < totalOrderItems ? page + 1 : null,
        hasNextPage: takePages * page <= totalOrderItems ?? false,
        prevtPage: page <= 1 ? null : page - 1,
        hasPrevtPage: page <= 1 ? false : true,
      };
    } catch (error) {
      console.error(error);
      return {
        ok: false,
        error: '교환이나 환불된 주문 목록을 찾을 수가 없습니다.',
      };
    }
  }
}
