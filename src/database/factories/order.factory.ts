import * as Faker from 'faker';
import { define } from 'typeorm-seeding';

import { Order } from '../../apis/orders/entities/order.entity';
import { formmatDay } from '../../utils/dayUtils';

const orderFaker = async (faker: typeof Faker) => {
  const order = new Order();

  order.deliverRequest = faker.lorem.paragraph();
  order.destination = faker.address.city();
  order.orderedAt = formmatDay(new Date());
  order.total = faker.random.number();
  order.orderItems = [];

  return order;
};

define<Promise<Order>, unknown>(Order, orderFaker);
