/**
 * LRU (Least Recently Used) 缓存实现
 * 用于缓存计算结果,避免重复计算,提升性能
 *
 * 使用场景:
 * - 样本量计算结果缓存
 * - 验证结果缓存
 * - 参数规范化结果缓存
 *
 * @module utils/lru-cache
 */

/**
 * LRU缓存节点
 * @private
 */
class LRUNode {
  constructor(key, value) {
    this.key = key
    this.value = value
    this.prev = null
    this.next = null
  }
}

/**
 * LRU缓存实现
 *
 * 特性:
 * 1. 固定容量,超出时淘汰最久未使用的项
 * 2. O(1)时间复杂度的get和put操作
 * 3. 使用双向链表+哈希表实现
 * 4. 支持自定义键生成函数
 */
class LRUCache {
  /**
   * 构造函数
   * @param {number} capacity - 缓存容量,默认100
   */
  constructor(capacity = 100) {
    this.capacity = capacity
    this.size = 0
    this.cache = new Map() // key -> LRUNode

    // 双向链表的头尾哨兵节点
    this.head = new LRUNode(null, null)
    this.tail = new LRUNode(null, null)
    this.head.next = this.tail
    this.tail.prev = this.head

    // 统计信息
    this.hits = 0 // 缓存命中次数
    this.misses = 0 // 缓存未命中次数
  }

  /**
   * 将节点移到链表头部 (最近使用)
   * @private
   * @param {LRUNode} node
   */
  _moveToHead(node) {
    this._removeNode(node)
    this._addToHead(node)
  }

  /**
   * 添加节点到链表头部
   * @private
   * @param {LRUNode} node
   */
  _addToHead(node) {
    node.prev = this.head
    node.next = this.head.next
    this.head.next.prev = node
    this.head.next = node
  }

  /**
   * 从链表中移除节点
   * @private
   * @param {LRUNode} node
   */
  _removeNode(node) {
    node.prev.next = node.next
    node.next.prev = node.prev
  }

  /**
   * 移除链表尾部节点 (最久未使用)
   * @private
   * @returns {LRUNode}
   */
  _removeTail() {
    const node = this.tail.prev
    this._removeNode(node)
    return node
  }

  /**
   * 获取缓存值
   * @param {string} key - 缓存键
   * @returns {*} 缓存值,如果不存在返回undefined
   */
  get(key) {
    const node = this.cache.get(key)

    if (!node) {
      this.misses++
      return undefined
    }

    // 移到头部 (标记为最近使用)
    this._moveToHead(node)
    this.hits++

    return node.value
  }

  /**
   * 设置缓存值
   * @param {string} key - 缓存键
   * @param {*} value - 缓存值
   */
  put(key, value) {
    let node = this.cache.get(key)

    if (node) {
      // 更新已存在的节点
      node.value = value
      this._moveToHead(node)
    } else {
      // 创建新节点
      node = new LRUNode(key, value)
      this.cache.set(key, node)
      this._addToHead(node)
      this.size++

      // 如果超出容量,移除最久未使用的节点
      if (this.size > this.capacity) {
        const removed = this._removeTail()
        this.cache.delete(removed.key)
        this.size--
      }
    }
  }

  /**
   * 检查缓存是否存在
   * @param {string} key - 缓存键
   * @returns {boolean}
   */
  has(key) {
    return this.cache.has(key)
  }

  /**
   * 删除缓存项
   * @param {string} key - 缓存键
   * @returns {boolean} 是否删除成功
   */
  delete(key) {
    const node = this.cache.get(key)
    if (!node) {
      return false
    }

    this._removeNode(node)
    this.cache.delete(key)
    this.size--
    return true
  }

  /**
   * 清空缓存
   */
  clear() {
    this.cache.clear()
    this.size = 0
    this.head.next = this.tail
    this.tail.prev = this.head
    this.hits = 0
    this.misses = 0
  }

  /**
   * 获取缓存命中率
   * @returns {number} 命中率 (0-1)
   */
  getHitRate() {
    const total = this.hits + this.misses
    return total === 0 ? 0 : this.hits / total
  }

  /**
   * 获取缓存统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      size: this.size,
      capacity: this.capacity,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.getHitRate()
    }
  }

  /**
   * 生成缓存键 (辅助函数)
   * 将对象转换为稳定的字符串键
   * @param {Object} params - 参数对象
   * @returns {string} 缓存键
   * @example
   * const key = cache.generateKey({ p1: 0.5, p2: 0.6, alpha: 0.05 })
   * // 返回: "alpha:0.05|p1:0.5|p2:0.6"
   */
  static generateKey(params) {
    // 按键名排序,确保相同参数生成相同键
    const keys = Object.keys(params).sort()
    const parts = keys.map(k => {
      const v = params[k]
      // 处理数组
      if (Array.isArray(v)) {
        return `${k}:[${v.join(',')}]`
      }
      // 处理对象
      if (typeof v === 'object' && v !== null) {
        return `${k}:${JSON.stringify(v)}`
      }
      // 处理基本类型
      return `${k}:${v}`
    })
    return parts.join('|')
  }
}

export { LRUCache }
