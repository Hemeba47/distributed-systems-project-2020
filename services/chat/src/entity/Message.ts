import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  // this comes from the other service
  @Column()
  userId: number;

  @Column()
  content: string;

  @Column("timestamp", { default: () => "LOCALTIMESTAMP" })
  createdAt: string;
}
