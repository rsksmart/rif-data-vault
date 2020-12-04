import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm'

@Entity()
export default class IpfsMetadata {
  constructor (did: string, key: string, cid: string, contentSize: number) {
    this.did = did
    this.key = key
    this.cid = cid
    this.contentSize = contentSize
  }

  @PrimaryGeneratedColumn()
  id!: number;

  @Column('text')
  did!: string;

  @Column('text')
  key!: string;

  @Column('text')
  cid!: string;

  @Column('integer')
  contentSize!: number;
}
