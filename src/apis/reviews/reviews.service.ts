import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { OrderItem } from '@apis/orders/entities/order-item.entity';
import { Product } from '@apis/products/entities/product.entity';
import { User, UserRole } from '@apis/users/entities/user.entity';
import {
  CreateReviewInput,
  CreateReviewOutput,
} from '@apis/reviews/dtos/create-review.dto';
import {
  DeleteReviewInput,
  DeleteReviewOutput,
} from '@apis/reviews/dtos/delete-review.dto';
import {
  EditReviewInput,
  EditReviewOutput,
} from '@apis/reviews/dtos/edit-review.dto';
import {
  GetReviewsOnConsumerInput,
  GetReviewsOnConsumerOutput,
} from '@apis/reviews/dtos/get-reviews-on-consumer.dto';
import {
  GetReviewsOnProductInput,
  GetReviewsOnProductOutput,
} from '@apis/reviews/dtos/get-reviews-on-products.dto';
import { Review } from '@apis/reviews/entities/review.entity';
import { createPaginationObj } from '@apis/common/dtos/pagination.dto';
import { formmatDay } from '@utils';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviews: Repository<Review>,

    @InjectRepository(Product)
    private readonly products: Repository<Product>,

    @InjectRepository(OrderItem)
    private readonly orderItems: Repository<OrderItem>,

    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async getReviewsOnProduct({
    productId,
    page = 1,
  }: GetReviewsOnProductInput): Promise<GetReviewsOnProductOutput> {
    try {
      const product = await this.products.findOne({ id: productId });

      if (!product) {
        return {
          ok: false,
          error: '해당 상품이 없습니다.',
        };
      }

      const takePages = 8;
      const [reviews, totalReviews] = await this.reviews.findAndCount({
        where: {
          product,
        },
        skip: (page - 1) * takePages,
        take: takePages,
        order: {
          createdAt: 'DESC',
        },
        relations: ['product', 'commenter'],
      });

      let totalRating = 0;
      let avgRating = 0;

      if (totalReviews > 0) {
        for (const review of reviews) {
          totalRating += review.rating;
        }
        avgRating = totalRating / totalReviews;
      }

      const paginationObj = createPaginationObj({
        takePages,
        page,
        totalData: totalReviews,
      });

      return {
        ok: true,
        reviews,
        avgRating,
        ...paginationObj,
      };
    } catch (error) {
      console.error(error);
      return {
        ok: false,
        error: '상품에 대한 댓글을 보실 수가 없습니다.',
      };
    }
  }

  async getReviewsOnConsumer(
    { consumerId }: GetReviewsOnConsumerInput,
    commenter: User,
  ): Promise<GetReviewsOnConsumerOutput> {
    try {
      const consumer = await this.users.findOne(
        { id: consumerId },
        {
          relations: ['reviews', 'reviews.product'],
        },
      );

      if (commenter.id !== consumer.id && commenter.role !== UserRole.Admin) {
        return {
          ok: false,
          error: '사용자의 댓글 목록을 보실 수 없습니다.',
        };
      }

      const reviews: Review[] = consumer.reviews;

      return {
        ok: true,
        reviews,
      };
    } catch (error) {
      console.error(error);
      return {
        ok: false,
        error: '사용자의 댓글 목록을 보실 수 없습니다.',
      };
    }
  }

  async createReview(
    createReviewInput: CreateReviewInput,
    commenter: User,
  ): Promise<CreateReviewOutput> {
    try {
      const product = await this.products.findOne({
        where: {
          id: createReviewInput.productId,
        },
        relations: ['reviews'],
      });

      if (!product) {
        return {
          ok: false,
          error: '해당 상품이 존재하지 않습니다.',
        };
      }

      const orderItem = await this.orderItems.findOne({
        where: {
          consumer: commenter,
          product,
        },
        relations: ['consumer'],
      });

      if (commenter.id !== orderItem.consumer.id) {
        return {
          ok: false,
          error: '댓글을 다실 수가 없습니다.',
        };
      }

      const review = await this.reviews.save(
        this.reviews.create({
          ...createReviewInput,
          commenter,
          product,
          reviewedAt: '',
        }),
      );

      const reviewedAt = formmatDay(review.createdAt);

      review.reviewedAt = reviewedAt;
      await this.reviews.save(review);

      let totalRating = 0;
      let avgRating = 0;

      if (product.reviews.length > 0) {
        const totalReviews = product.reviews.length - 1;
        totalRating =
          product.avgRating * totalReviews + createReviewInput.rating;
        avgRating = !!totalReviews
          ? totalRating
          : totalRating / (totalReviews + 1);
      }

      product.avgRating = avgRating;

      return {
        ok: true,
        review,
      };
    } catch (error) {
      console.error(error);
      return {
        ok: false,
        error: '댓글을 다실 수가 없습니다.',
      };
    }
  }

  async editReview(
    { id, content }: EditReviewInput,
    commenter: User,
  ): Promise<EditReviewOutput> {
    try {
      const review = await this.reviews.findOne(
        { id },
        {
          relations: ['commenter'],
        },
      );

      if (!review) {
        return {
          ok: false,
          error: '해당 댓글이 존재하지 않습니다.',
        };
      }

      if (review.commenter.id !== commenter.id) {
        return {
          ok: false,
          error: '해당 댓글을 수정하실 수 없습니다.',
        };
      }

      review.content = content;
      await this.reviews.save(review);

      return {
        ok: true,
        review,
      };
    } catch (error) {
      console.error(error);
      return {
        ok: false,
        error: '댓글을 수정하실 수가 없습니다.',
      };
    }
  }

  async deleteReview(
    { reviewId }: DeleteReviewInput,
    commenter: User,
  ): Promise<DeleteReviewOutput> {
    try {
      const review = await this.reviews.findOne(
        { id: reviewId },
        {
          relations: ['commenter'],
        },
      );

      if (!review) {
        return {
          ok: false,
          error: '해당 댓글이 존재하지 않습니다.',
        };
      }

      if (review.commenter.id !== commenter.id) {
        return {
          ok: false,
          error: '해당 댓글을 삭제하실 수 없습니다.',
        };
      }

      await this.reviews.delete(reviewId);

      return {
        ok: true,
      };
    } catch (error) {
      console.error(error);
      return {
        ok: false,
        error: '댓글을 삭제하실 수가 없습니다.',
      };
    }
  }
}
