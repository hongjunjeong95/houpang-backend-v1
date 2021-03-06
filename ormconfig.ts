import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Category } from '@apis/categories/entities/category.entity';
import { Like } from '@apis/likes/entities/likes.entity';
import { OrderItem } from '@apis/orders/entities/order-item.entity';
import { Order } from '@apis/orders/entities/order.entity';
import { Product } from '@apis/products/entities/product.entity';
import { Refund } from '@apis/refunds/entities/refund.entity';
import { Review } from '@apis/reviews/entities/review.entity';
import { User } from '@apis/users/entities/user.entity';

const config: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  synchronize: false,
  keepConnectionAlive: true,
  logging: ['warn', 'error'],
  entities: [
    //
    User,
    Product,
    Category,
    Order,
    OrderItem,
    Like,
    Refund,
    Review,
  ],
  migrations: ['dist/database/migrations/**/*.js'],
  cli: {
    entitiesDir: 'src/**/entities',
    migrationsDir: 'src/database/migrations',
  },
  // @ts-ignore
  seeds: ['src/database/seeds/**/*.ts'],
  factories: ['src/database/factories/**/*.ts'],
  baseUrl: './',
};

export = config;
