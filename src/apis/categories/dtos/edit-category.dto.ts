import {
  Field,
  InputType,
  ObjectType,
  PartialType,
  PickType,
} from '@nestjs/graphql';

import { CoreOutput } from '@apis/common/dtos/output.dto';
import { Category } from '@apis/categories/entities/category.entity';

@InputType()
export class EditCategoryInput extends PickType(PartialType(Category), [
  'name',
  'coverImg',
]) {
  @Field((type) => String)
  categoryId: string;
}

@ObjectType()
export class EditCategoryOutput extends CoreOutput {}
