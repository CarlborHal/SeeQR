import mysql from 'mysql2/promise';
import { Pool, PoolConfig } from 'pg';
import sqlite3 from 'sqlite3';
import { LogType } from '../../../shared/types/types';
import logger from '../utils/logging/masterlog';
import pools from './poolVariables';
import fs from 'fs'
import path from 'path'

export default {
  /**
   * For a local Postgres database.
   * Uses passed in arguments to create a URI to create a pool, save it, and begin a connection.
   * @param pg_uri URI created in models.ts using login info
   * @param db Name of target database that the login has access to. Initially empty string
   */
    async PG_DBConnect(pg_uri: string, db: string) {
    const newURI = `${pg_uri}/${db}`;
    const newPool = new Pool({ connectionString: newURI });
    pools.pg_pool = newPool;
    // await pools.pg_pool.connect(); this is unnecessary for making queries, and causes pg error when trying to drop db
    //! need to update this
    await pools.pg_pool.query('SELECT pg_database.datname FROM pg_database'); // this test query will throw an error if connection failed
  },

  async PG_DBDisconnect(): Promise<void> {
    if (pools.pg_pool) await pools.pg_pool.end();
  },

  /**
   * For a local MySQL database.
   * If a connection already exists, end the connection.
   * Use passed in login info to create a new pool and save it.
   * @param MYSQL_CREDS https://github.com/mysqljs/mysql
   *    {
          host: `localhost`,
          port: MSQL_Cred.port,             from config file
          user: MSQL_Cred.user,             from config file
          password: MSQL_Cred.password,     from config file
          database: this.curMSQL_DB,        target database
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
          multipleStatements: true,
        }
   */
  async MSQL_DBConnect(MYSQL_CREDS: mysql.PoolOptions) {
        console.log('i am here')
    console.log("MYSQL", MYSQL_CREDS)
    if (pools.msql_pool) await pools.msql_pool.end();

    pools.msql_pool = mysql.createPool({ ...MYSQL_CREDS });
  },

  /**
   * Checks that the MySQL database connection/pool is valid by running short query.
   * @param db Name of target MySQL database
   */
  MSQL_DBQuery(db: string): Promise<void> {
    if (pools.msql_pool === undefined) {
      logger(`No active MSQL pool for DB: ${db}`, LogType.ERROR);
      return new Promise((res, rej) => {
        rej(Error('No active MSQL Pool in attempted query'));
      });
    }
    return pools.msql_pool
      .query(`USE ${db};`)
      .then(() => {
        logger(`Connected to MSQL DB: ${db}`, LogType.SUCCESS);
      })
      .catch(() => {
        logger(`Couldnt connect to MSQL DB: ${db}`, LogType.ERROR);
      });
  },

  /**
   * Create pool and connect to an RDS Postgres database using login info.
   * @param RDS_PG_INFO from config file
   */
  async RDS_PG_DBConnect(RDS_PG_INFO: PoolConfig) {
  //   console.log("RDSCONNECTHAPPENING")
  //   const cert = path.resolve(__dirname, 'us-east-2-bundle.pem').toString()
  //   RDS_PG_INFO.ssl= {
  //   ca: fs.readFileSync(cert),// this is required
  //   rejectUnauthorized: true,
  // }
  //   // console.log({ ...RDS_PG_INFO })
  //   pools.rds_pg_pool = new Pool({ ...RDS_PG_INFO });
  //       // pools.rds_pg_pool = new Pool({connectionString: '"postgres://postgres:hanshotfirst21@database-1.c1y4sawmyo3c.us-east-2.rds.amazonaws.com:5432/postgres?sslmode=require"'});
  //   await pools.rds_pg_pool.connect();
  },

  /**
   * End RDS MySQL pool if one exists.
   * Create/save new pool using login info.
   * @param RDS_MSQL_INFO from config file
   */
  async RDS_MSQL_DBConnect(RDS_MSQL_INFO: mysql.PoolOptions) {
    if (pools.rds_msql_pool) await pools.rds_msql_pool.end();
    pools.rds_msql_pool = mysql.createPool({ ...RDS_MSQL_INFO });
  },

  /**
   * Checks that the MySQL database connection/pool is valid by running short query.
   * @param db name of target RDS MySQL database
   */
  RDS_MSQL_DBQuery(db: string): Promise<void> {
    if (pools.rds_msql_pool === undefined) {
      logger(`No active RDS MSQL pool for DB: ${db}`, LogType.ERROR);
      return new Promise((res, rej) => {
        rej(Error(`No active RDS MSQL pool for DB: ${db}`));
      });
    }
    return pools.rds_msql_pool
      .query(`USE ${db};`)
      .then(() => {
        logger(`Connected to MSQL DB: ${db}`, LogType.SUCCESS);
      })
      .catch(() => {
        logger(`Couldnt connect to MSQL DB: ${db}`, LogType.ERROR);
      });
  },

  SQLite_DBConnect(path: string): void {
    const newDB = new sqlite3.Database(
      path,
      sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
      (err) => (err ? console.error(err.message) : null),
    );
    pools.sqlite_db = newDB;
  },
};
