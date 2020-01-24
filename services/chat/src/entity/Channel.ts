import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export class Channel {
  @PrimaryGeneratedColumn()
  id: number;

  // this comes from the other service
  @Column()
  owner: number;

  @Column()
  name: string;

  @Column()
  description: string;

  @Column("timestamp", { default: () => "LOCALTIMESTAMP" })
  createdAt: string;
}
