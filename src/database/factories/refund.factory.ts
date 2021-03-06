import { define } from 'typeorm-seeding';
import Faker from 'faker';

import { Refund, RefundStatus } from '@apis/refunds/entities/refund.entity';
import { formmatDay } from '@utils';

const refundFaker = (faker: typeof Faker) => {
  const refund = new Refund();

  refund.refundedAt = formmatDay(new Date());
  refund.problemTitle = Faker.lorem.sentence();
  refund.problemDescription = Faker.lorem.paragraph();
  refund.status = Faker.random.objectElement<RefundStatus>(RefundStatus);
  refund.recallTitle = Faker.lorem.sentence();
  refund.recallDescription = Faker.lorem.paragraph();

  return refund;
};

define(Refund, refundFaker);
