import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { SortState } from '@apis/common/common';
import {
  PaginationInput,
  PaginationOutput,
} from '@apis/common/dtos/pagination.dto';

import { Product } from '@apis/products/entities/product.entity';

@InputType()
export class GetProductsBySearchTermInput extends PaginationInput {
  @Field((type) => String)
  query: string;

  @Field((type) => String, { defaultValue: 'created_at desc' })
  sort?: SortState;
}

@ObjectType()
export class GetProductsBySearchTermOutput extends PaginationOutput {
  @Field((type) => [Product], { nullable: true })
  products?: Product[];
}
