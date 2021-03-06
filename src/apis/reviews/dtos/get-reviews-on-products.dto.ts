import { Field, Float, InputType, ObjectType } from '@nestjs/graphql';

import {
  PaginationInput,
  PaginationOutput,
} from '@apis/common/dtos/pagination.dto';
import { Review } from '@apis/reviews/entities/review.entity';

@InputType()
export class GetReviewsOnProductInput extends PaginationInput {
  @Field((type) => String)
  productId: string;
}

@ObjectType()
export class GetReviewsOnProductOutput extends PaginationOutput {
  @Field((type) => [Review])
  reviews?: Review[];

  @Field((type) => Float)
  avgRating?: number;
}
