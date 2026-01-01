import Dexie from 'dexie';

import { DB_File } from '../schemas/files';
import { DB_Message } from '../schemas/message';
import { DB_Plugin } from '../schemas/plugin';
import { DB_Session } from '../schemas/session';
import { DB_SessionGroup } from '../schemas/sessionGroup';
import { DB_Thread } from '../schemas/thread';
import { DB_Topic } from '../schemas/topic';
import { DB_User } from '../schemas/user';
import { dbSchemaV10 } from './schemas';
import { DBModel, LOBE_CHAT_LOCAL_DB_NAME } from './types/db';

export interface LobeDBSchemaMap {
  files: DB_File;
  messages: DB_Message;
  plugins: DB_Plugin;
  sessionGroups: DB_SessionGroup;
  sessions: DB_Session;
  topics: DB_Topic;
  users: DB_User;
  threads: DB_Thread;
}

// Define a local DB
export class BrowserDB extends Dexie {
  public files: BrowserDBTable<'files'>;
  public sessions: BrowserDBTable<'sessions'>;
  public messages: BrowserDBTable<'messages'>;
  public topics: BrowserDBTable<'topics'>;
  public plugins: BrowserDBTable<'plugins'>;
  public sessionGroups: BrowserDBTable<'sessionGroups'>;
  public users: BrowserDBTable<'users'>;
  public threads: BrowserDBTable<'threads'>;

  constructor() {
    super(LOBE_CHAT_LOCAL_DB_NAME);

    this.version(10).stores(dbSchemaV10);

    this.files = this.table('files');
    this.sessions = this.table('sessions');
    this.messages = this.table('messages');
    this.topics = this.table('topics');
    this.plugins = this.table('plugins');
    this.sessionGroups = this.table('sessionGroups');
    this.users = this.table('users');
    this.threads = this.table('threads');
  }
}

export const browserDB = new BrowserDB();

// ================================================ //
// ================================================ //
// ================================================ //
// ================================================ //
// ================================================ //

// types helper
export type BrowserDBSchema = {
  [t in keyof LobeDBSchemaMap]: {
    model: LobeDBSchemaMap[t];
    table: Dexie.Table<DBModel<LobeDBSchemaMap[t]>, string>;
  };
};
type BrowserDBTable<T extends keyof LobeDBSchemaMap> = BrowserDBSchema[T]['table'];
