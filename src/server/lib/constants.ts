/** @format */

/**
 * Redis commands and their arguments
 */
export const redisCommandArgs: { [key: string]: string[] } = Object.freeze({
  get: ["key"],
  set: ["key", "value"],
  GET: ["key"],
  SET: ["key", "value"],
  // mGet: ["key"],
  // mSet: ["key"],
  // HSET: ["hash", "field", "value"],
  // hSet: ["hash", "field", "value"],
  // HGET: ["hash", "field"],
  // hGet: ["hash", "field"],
  // HGETALL: ["hash"],
  // hGetAll: ["hash"],
  DEL: ["key"],
  del: ["key"],
  EXISTS: ["key"],
  exists: ["key"],
  // INCR: ["key"],
  // incr: ["key"],
  // DECR: ["key"],
  // decr: ["key"],
  APPEND: ["key", "value"],
  append: ["key", "value"],
  // HDEL: ["hash", "field"],
  // hDel: ["hash", "field"],
  // HEXISTS: ["hash", "field"],
  // hExists: ["hash", "field"],
  // HINCRBY: ["hash", "field", "increment"],
  // hIncrBy: ["hash", "field", "increment"],
  // HLEN: ["hash"],
  // hLen: ["hash"],
  // LPUSH: ["key", "value"],
  // lPush: ["key", "value"],
  // LPOP: ["key"],
  // lPop: ["key"],
  // LLEN: ["key"],
  // lLen: ["key"],
  // LINDEX: ["key", "index"],
  // lIndex: ["key", "index"],
  // RPUSH: ["key", "value"],
  // rPush: ["key", "value"],
  // RPOP: ["key"],
  // rPop: ["key"],
  // SADD: ["key", "value"],
  // sAdd: ["key", "value"],
  // SREM: ["key", "value"],
  // sRem: ["key", "value"],
  // SCARD: ["key"],
  // sCard: ["key"],
  // SMEMBERS: ["key"],
  // sMembers: ["key"],
  // ZADD: ["key", "score", "value"],
  // zAdd: ["key", "score", "value"],
  // ZREM: ["key", "value"],
  // zRem: ["key", "value"],
  // ZCARD: ["key"],
  // zCard: ["key"],
  // ZRANGE: ["key", "start", "stop"],
  // zRange: ["key", "start", "stop"],
  // ZRANK: ["key", "member"],
  // zRank: ["key", "member"],
  // ZSCORE: ["key", "member"],
  // zScore: ["key", "member"],
  // ZREVRANK: ["key", "member"],
  // zRevRank: ["key", "member"],
  // ZINCRBY: ["key", "increment", "member"],
  // zIncrBy: ["key", "increment", "memberex"],
});

/**
 * Node cache commands and their arguments
 */
export const nodeCacheCommandsArgs: { [key: string]: string[] } = Object.freeze(
  {
    // Read operations (hits/misses)
    get: ["key"],
    // mget: ["key"],
    has: ["key"],
    
    // Write operations
    set: ["key", "value"],
    // mset: ["key"],
    del: ["key"],
    take: ["key"],
    
    // Special operations that still fit our paradigm
    // flushAll: [],
  }
);

/**
 * IO Redis commands and their arguments
 */
export const ioRedisCommandsArgs: { [key: string]: string[] } = Object.freeze({
  get: ["key"],
  set: ["key", "value"],
  // mget: ["key"],
  // mset: ["key"],
  // hset: ["hash", "field", "value"],
  // hget: ["hash", "field"],
  // hgetall: ["hash"],
  del: ["key"],
  exists: ["key"],
  // incr: ["key"],
  // decr: ["key"],
  // append: ["key", "value"],
  // hdel: ["hash", "field"],
  // hexists: ["hash", "field"],
  // hincrby: ["hash", "field", "increment"],
  // hlen: ["hash"],
  // lpush: ["key", "value"],
  // lopo: ["key"],
  // llen: ["key"],
  // lindex: ["key", "index"],
  // rpush: ["key", "value"],
  // rpop: ["key"],
  // sadd: ["key", "value"],
  // srem: ["key", "value"],
  // scard: ["key"],
  // smembers: ["key"],
  // zadd: ["key", "score", "value"],
  // zrem: ["key", "value"],
  // zcard: ["key"],
  // zrange: ["key", "start", "stop"],
  // zrank: ["key", "member"],
  // zscore: ["key", "member"],
  // zrevrank: ["key", "member"],
  // zincrby: ["key", "increment", "member"],
});


export const levelDBCommandsArgs: { [key: string]: string[] } = Object.freeze({
  get: ["key"],
  put: ["key", "value"],
  del: ["key"],
});


/**
 * A mapping of LRU Cache methods to their argument names.
 * Extend or modify as needed.
 */
export const LRUCacheCommandArgsMapping: { [key: string]: string[] } = {
  get: ["key"],
  set: ["key", "value"],
  has: ["key"],
  del: ["key"],
};