import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { CoreOutput } from 'src/common/dtos/output.dto';
import { OrderItem } from '../entities/order-item.entity';

@InputType()
export class GetOrdersFromProviderInput {
  @Field((type) => String)
  providerId: string;
}

@ObjectType()
export class GetOrdersFromProviderOutput extends CoreOutput {
  @Field((type) => [OrderItem], { nullable: true })
  orderItems?: OrderItem[];
}
