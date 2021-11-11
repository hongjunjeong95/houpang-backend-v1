import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { SortState } from 'src/apis/common/common';

import {
  PaginationInput,
  PaginationOutput,
} from 'src/apis/common/dtos/pagination.dto';
import { Product } from '../entities/product.entity';

@InputType()
export class GetProductsFromProviderInput extends PaginationInput {
  @Field((type) => String, { defaultValue: 'created_at desc' })
  sort?: SortState;
}

@ObjectType()
export class GetProductsFromProviderOutput extends PaginationOutput {
  @Field((type) => [Product], { nullable: true })
  products?: Product[];
}

export type GetProductsFromProviderQuery = {
  page: string;
  sort: SortState;
};
