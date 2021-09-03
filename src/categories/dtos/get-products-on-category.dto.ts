import { Field, InputType, ObjectType } from '@nestjs/graphql';

import {
  PaginationInput,
  PaginationOutput,
} from 'src/common/dtos/pagination.dto';
import { Product } from 'src/products/entities/product';

@InputType()
export class GetProductsOnCategoryInput extends PaginationInput {
  @Field((type) => String)
  slug?: string;
}

@ObjectType()
export class GetProductsOnCategoryOutput extends PaginationOutput {
  @Field((type) => [Product])
  products?: Product[];
}