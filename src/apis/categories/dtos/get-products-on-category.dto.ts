import { Field, InputType, ObjectType } from '@nestjs/graphql';

import {
  PaginationInput,
  PaginationOutput,
} from '@apis/common/dtos/pagination.dto';
import { Product } from '@apis/products/entities/product.entity';

@InputType()
export class GetProductsOnCategoryInput extends PaginationInput {
  @Field((type) => String)
  slug?: string;
}

@ObjectType()
export class GetProductsOnCategoryOutput extends PaginationOutput {
  @Field((type) => [Product], { nullable: true })
  products?: Product[];

  @Field((type) => String, { nullable: true })
  categoryName?: string;
}
