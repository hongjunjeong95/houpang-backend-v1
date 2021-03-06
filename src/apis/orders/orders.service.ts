import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Any, Repository } from 'typeorm';

import { Product } from '@apis/products/entities/product.entity';
import { User, UserRole } from '@apis/users/entities/user.entity';
import {
  CreateOrderInput,
  CreateOrderOutput,
} from '@apis/orders/dtos/create-order.dto';
import {
  GetOrdersFromProviderInput,
  GetOrdersFromProviderOutput,
} from '@apis/orders/dtos/get-orders-from-provider.dto';
import {
  GetOrdersFromConsumerInput,
  GetOrdersFromConsumerOutput,
} from '@apis/orders/dtos/get-orders-from-consumer.dto';
import {
  OrderItem,
  OrderStatus,
} from '@apis/orders/entities/order-item.entity';
import { Order } from '@apis/orders/entities/order.entity';
import {
  FindOrderByIdInput,
  FindOrderByIdOutput,
} from '@apis/orders/dtos/find-order-by-id.dto';
import {
  FindOrderItemByIdInput,
  FindOrderItemByIdOutput,
} from '@apis/orders/dtos/find-order-item-by-id';
import { formmatDay } from '@utils';
import {
  CancelOrderItemInput,
  CancelOrderItemOutput,
} from '@apis/orders/dtos/cancel-order-item.dto';
import {
  UpdateOrerStatusInput,
  UpdateOrerStatusOutput,
} from '@apis/orders/dtos/update-order-status.dto';
import { createPaginationObj } from '@apis/common/dtos/pagination.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orders: Repository<Order>,

    @InjectRepository(OrderItem)
    private readonly orderItems: Repository<OrderItem>,

    @InjectRepository(Product)
    private readonly products: Repository<Product>,

    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async getOrdersFromConsumer({
    consumerId,
    page = 1,
  }: GetOrdersFromConsumerInput): Promise<GetOrdersFromConsumerOutput> {
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
      const [orders, totalOrders] = await this.orders.findAndCount({
        where: {
          consumer,
        },
        skip: (page - 1) * takePages,
        take: takePages,
        relations: [
          'orderItems',
          'orderItems.product',
          'orderItems.product.category',
          'orderItems.product.provider',
        ],
        order: {
          createdAt: 'DESC',
        },
      });

      const paginationObj = createPaginationObj({
        takePages,
        page,
        totalData: totalOrders,
      });

      return {
        ok: true,
        orders,
        ...paginationObj,
      };
    } catch (error) {
      console.error(error);
      return {
        ok: false,
        error: '고객의 주문들을 가져올 수가 없습니다.',
      };
    }
  }

  async getOrdersFromProvider({
    providerId,
    page = 1,
  }: GetOrdersFromProviderInput): Promise<GetOrdersFromProviderOutput> {
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
              OrderStatus.Checking,
              OrderStatus.Delivering,
              OrderStatus.Delivered,
              OrderStatus.Received,
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

      const paginationObj = createPaginationObj({
        takePages,
        page,
        totalData: totalOrderItems,
      });

      return {
        ok: true,
        orderItems,
        ...paginationObj,
      };
    } catch (error) {
      console.error(error);
      return {
        ok: false,
        error: '공급자에게 판매된 주문을 가져올 수가 없습니다.',
      };
    }
  }

  async findOrderById({
    orderId,
    consumerId,
  }: FindOrderByIdInput): Promise<FindOrderByIdOutput> {
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

      const order = await this.orders.findOne({
        where: {
          id: orderId,
        },
        relations: [
          'orderItems',
          'orderItems.product',
          'orderItems.product.category',
          'orderItems.product.provider',
        ],
      });

      if (!order) {
        return {
          ok: false,
          error: '주문 ID에 해당하는 주문이 없습니다.',
        };
      }

      return {
        ok: true,
        order,
      };
    } catch (error) {
      console.error(error);
      return {
        ok: false,
        error: '해당 주문 ID 값의 주문을 가져올 수가 없습니다.',
      };
    }
  }

  async findOrderItemById({
    orderItemId,
    providerId,
  }: FindOrderItemByIdInput): Promise<FindOrderItemByIdOutput> {
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

      const orderItem = await this.orderItems.findOne({
        where: {
          id: orderItemId,
        },
        relations: ['product', 'product.provider', 'product.category', 'order'],
      });

      if (!orderItem) {
        return {
          ok: false,
          error: '해당 품목에 대한 주문이 없습니다.',
        };
      }

      return {
        ok: true,
        orderItem,
      };
    } catch (error) {
      console.error(error);
      return {
        ok: false,
        error: '상품 품목들을 가져올 수 없습니다.',
      };
    }
  }

  async createOrder(
    { createOrderItems, destination, deliverRequest }: CreateOrderInput,
    consumer: User,
  ): Promise<CreateOrderOutput> {
    try {
      let orderFinalPrice = 0;
      const orderItems: OrderItem[] = [];
      for (const createOrderItem of createOrderItems) {
        const product = await this.products.findOne({
          id: createOrderItem.productId,
        });
        if (!product) {
          for (const orderItem of orderItems) {
            await this.orderItems.delete(orderItem);
          }
          return {
            ok: false,
            error: '상품을 찾을 수가 없습니다.',
          };
        }
        if (product.stock - createOrderItem.count < 0) {
          for (const orderItem of orderItems) {
            await this.orderItems.delete(orderItem);
          }
          return {
            ok: false,
            error: '상품의 재고보다 많은 수를 주문하셨습니다.',
          };
        }

        const productPrice = product.price * createOrderItem.count;
        orderFinalPrice += productPrice;

        product.stock -= createOrderItem.count;
        await this.products.save(product);

        const orderItem = await this.orderItems.save(
          this.orderItems.create({
            product,
            count: createOrderItem.count,
            consumer,
          }),
        );
        orderItems.push(orderItem);
      }

      const order = await this.orders.save(
        this.orders.create({
          consumer,
          orderItems,
          total: orderFinalPrice,
          destination,
          deliverRequest,
          orderedAt: '',
        }),
      );

      const orderedAt = formmatDay(order.createdAt);

      order.orderedAt = orderedAt;
      await this.orders.save(order);

      return {
        ok: true,
        orderId: order.id,
      };
    } catch (error) {
      console.error(error);
      return {
        ok: false,
        error: '주문을 하실 수가 없습니다.',
      };
    }
  }

  async cancelOrderItem(
    { orderItemId }: CancelOrderItemInput,
    consumer: User,
  ): Promise<CancelOrderItemOutput> {
    try {
      const orderItem = await this.orderItems.findOne({
        where: {
          id: orderItemId,
        },
        relations: ['product', 'order', 'order.consumer'],
      });

      if (!orderItem) {
        return {
          ok: false,
          error: '주문을 찾을 수가 없습니다.',
        };
      }

      if (orderItem.order.consumer.id !== consumer.id) {
        return {
          ok: false,
          error: '주문을 찾을 수가 없습니다.',
        };
      }

      if (orderItem.status !== OrderStatus.Checking) {
        return {
          ok: false,
          error: '주문을 취소할 수 없습니다.',
        };
      }

      orderItem.status = OrderStatus.Canceled;

      orderItem.product.stock += orderItem.count;
      await this.products.save(orderItem.product);

      const newOrderItem = await this.orderItems.save(orderItem);

      return {
        ok: true,
        orderItem: newOrderItem,
      };
    } catch (error) {
      console.error(error);
      return {
        ok: false,
        error: '주문을 취소할 수 없습니다.',
      };
    }
  }

  async updateOrderStatus(
    { orderItemId, orderStatus }: UpdateOrerStatusInput,
    user: User,
  ): Promise<UpdateOrerStatusOutput> {
    try {
      if (user.role === UserRole.Consumer) {
        return {
          ok: false,
          error: '주문 상태를 변경할 수 없습니다.',
        };
      }

      const orderItem = await this.orderItems.findOne({
        where: {
          id: orderItemId,
        },
        relations: ['product', 'order', 'order.consumer'],
      });

      if (!orderItem) {
        return {
          ok: false,
          error: '주문을 찾을 수가 없습니다.',
        };
      }

      if (orderItem.status === OrderStatus.Canceled) {
        return {
          ok: false,
          error: '주문을 변경할 수 없습니다.',
        };
      }

      let canEdit = true;
      if (user.role === UserRole.Provider) {
        if (orderStatus !== OrderStatus.Received) {
          canEdit = false;
        }
      } else if (user.role === UserRole.Admin) {
        if (
          orderStatus !== OrderStatus.Delivering &&
          orderStatus !== OrderStatus.Delivered
        ) {
          canEdit = false;
        }
      }

      if (!canEdit) {
        return {
          ok: false,
          error: '주문 상태를 변경할 수 없습니다.',
        };
      }

      const newOrderItem = await this.orderItems.save({
        id: orderItemId,
        status: orderStatus,
      });

      return {
        ok: true,
        orderItem: newOrderItem,
      };
    } catch (error) {
      console.error(error);
      return {
        ok: false,
        error: '주문 상태를 변경할 수 없습니다.',
      };
    }
  }
}
