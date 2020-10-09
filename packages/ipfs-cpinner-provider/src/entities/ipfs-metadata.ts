import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm'

@Entity()
export default class IpfsMetadata {
  constructor (did: string, key: string, cid: string) {
    this.did = did
    this.key = key
    this.cid = cid
  }

  @PrimaryGeneratedColumn()
  id!: number;

  @Column('text')
  did!: string;

  @Column('text')
  key!: string;

  @Column('text')
  cid!: string;
}
