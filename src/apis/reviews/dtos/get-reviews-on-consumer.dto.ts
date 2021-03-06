import { Field, InputType, ObjectType } from '@nestjs/graphql';

import { CoreOutput } from '@apis/common/dtos/output.dto';
import { Review } from '@apis/reviews/entities/review.entity';

@InputType()
export class GetReviewsOnConsumerInput {
  @Field((type) => String)
  consumerId: string;
}

@ObjectType()
export class GetReviewsOnConsumerOutput extends CoreOutput {
  @Field((type) => [Review])
  reviews?: Review[];
}
