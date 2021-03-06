import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/apis/users/entities/user.entity';
import { Raw, Repository } from 'typeorm';

import {
  CreateProductInput,
  CreateProductOutput,
} from '@apis/products/dtos/create-product.dto';
import {
  EditProductInput,
  EditProductOutput,
} from '@apis/products/dtos/edit-product.dto';
import {
  DeleteProductInput,
  DeleteProductOutput,
} from '@apis/products/dtos/delete-product.dto';
import {
  FindProductByIdInput,
  FindProductByIdOutput,
} from '@apis/products/dtos/find-product-by-id.dto';
import { Product } from '@apis/products/entities/product.entity';
import { CategoryRepository } from 'src/apis/categories/repositories/category.repository';
import {
  GetProductsFromProviderInput,
  GetProductsFromProviderOutput,
} from '@apis/products/dtos/get-products-from-provider.dto';
import { createPaginationObj } from '@apis/common/dtos/pagination.dto';
import {
  GetProductsBySearchTermInput,
  GetProductsBySearchTermOutput,
} from '@apis/products/dtos/get-products-by-name.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly products: Repository<Product>,

    private readonly categories: CategoryRepository,
  ) {}

  async getProductsBySearchTerm({
    page,
    query,
    sort = 'createdAt_desc',
  }: GetProductsBySearchTermInput): Promise<GetProductsBySearchTermOutput> {
    try {
      const takePages = 10;
      let order = {};
      switch (sort) {
        case 'createdAt_desc':
          order = {
            createdAt: 'DESC',
          };
          break;
        case 'price_desc':
          order = {
            price: 'DESC',
          };
          break;
        case 'price_asc':
          order = {
            price: 'ASC',
          };
          break;
        default:
          console.log(sort);
          throw new Error('상품이 존재하지 않습니다.');
      }

      const [products, totalProducts] = await this.products.findAndCount({
        where: {
          // RAW : raw sql query를 실행할 수 있도록 해준다.
          // %${query}%는 query가 포함된 값을 찾아준다.
          name: Raw((name) => `${name} ILIKE '%${query}%'`),
        },
        skip: (page - 1) * takePages,
        take: takePages,
        order,
        relations: ['provider', 'reviews'],
      });

      const paginationObj = createPaginationObj({
        takePages,
        page,
        totalData: totalProducts,
      });

      return {
        ok: true,
        products,
        ...paginationObj,
      };
    } catch (error) {
      console.error(error);
      return {
        ok: false,
        error: '상품 품목들을 가져올 수 없습니다.',
      };

      // return {
      //   ok: false,
      //   errorObj: new Error(error),
      // };
    }
  }

  async findProductById({
    productId,
  }: FindProductByIdInput): Promise<FindProductByIdOutput> {
    // todo
    // category 내역에 있는 품목만 가져오는 것으로 만들기
    try {
      const product = await this.products.findOne(
        { id: productId },
        {
          relations: ['provider', 'category'],
        },
      );

      return {
        ok: true,
        product,
      };
    } catch (error) {
      console.error(error);
      return {
        ok: false,
        error: '상품 품목들을 가져올 수 없습니다.',
      };
    }
  }

  async getProductsFromProvider(
    { page = 1, sort }: GetProductsFromProviderInput,
    provider: User,
  ): Promise<GetProductsFromProviderOutput> {
    let order = {};

    const takePages = 10;
    try {
      switch (sort) {
        case 'createdAt_desc':
          order = {
            createdAt: 'DESC',
          };
          break;
        case 'price_desc':
          order = {
            price: 'DESC',
          };
          break;
        case 'price_asc':
          order = {
            price: 'ASC',
          };
          break;
        default:
          throw new Error('상품이 존재하지 않습니다.');
      }

      const [products, totalProducts] = await this.products.findAndCount({
        where: {
          provider,
        },
        relations: ['provider', 'reviews'],
        order,
        skip: (page - 1) * takePages,
        take: takePages,
      });

      const paginationObj = createPaginationObj({
        takePages,
        page,
        totalData: totalProducts,
      });

      return {
        ok: true,
        products,
        ...paginationObj,
      };
    } catch (error) {
      console.error(error);
      return {
        ok: false,
        error: '상품 품목들을 가져올 수 없습니다.',
      };
    }
  }

  async createProduct(
    createProductInput: CreateProductInput,
    provider: User,
  ): Promise<CreateProductOutput> {
    try {
      const product = await this.products.findOne({
        name: createProductInput.name,
        provider,
      });

      if (product) {
        return {
          ok: false,
          error: '이미 해당 상품을 추가하셨습니다.',
        };
      }

      const category = await this.categories.findOneBySlugUsingName(
        createProductInput.categoryName,
      );

      const newProduct = await this.products.save(
        this.products.create({ ...createProductInput, provider, category }),
      );

      return {
        ok: true,
        product: newProduct,
      };
    } catch (error) {
      console.error(error);
      return {
        ok: false,
        error: '상품을 추가할 수 없습니다.',
      };
    }
  }

  async editProduct(
    editProductInput: EditProductInput,
    provider: User,
  ): Promise<EditProductOutput> {
    try {
      const product = await this.products.findOne({
        id: editProductInput.productId,
        provider,
      });

      let category = product.category;

      if (!product) {
        return {
          ok: false,
          error: '수정하시려는 상품이 없습니다.',
        };
      }

      if (editProductInput.categoryName) {
        category = await this.categories.findOneBySlugUsingName(
          editProductInput.categoryName,
        );
      }

      await this.products.save({
        id: editProductInput.productId,
        ...editProductInput,
        category,
      });

      return {
        ok: true,
      };
    } catch (error) {
      console.error(error);
      return {
        ok: false,
        error: '상품을 수정할 수 없습니다.',
      };
    }
  }

  async deleteProduct(
    { productId }: DeleteProductInput,
    provider: User,
  ): Promise<DeleteProductOutput> {
    try {
      const product = await this.products.findOne({
        id: productId,
        provider,
      });

      if (!product) {
        return {
          ok: false,
          error: '삭제하시려는 상품을 찾을 수가 없습니다.',
        };
      }

      await this.products.delete(productId);

      return {
        ok: true,
      };
    } catch (error) {
      console.error(error);
      return {
        ok: false,
        error: '상품을 삭제할 수가 없습니다.',
      };
    }
  }
}
