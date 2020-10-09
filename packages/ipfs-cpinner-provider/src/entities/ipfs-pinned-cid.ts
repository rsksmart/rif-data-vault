import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm'

@Entity()
export default class IpfsPinnedCid {
  constructor (cid: string, count = 1) {
    this.cid = cid
    this.count = count
  }

  @PrimaryGeneratedColumn()
  id!: number;

  @Column('text')
  cid!: string;

  @Column('integer')
  count!: number;
}
