import { CHARACTER_LIMIT } from '../constants.js';

/**
 * 截断工具返回文本，防止输出超限。
 * 超限时在结果中追加 truncated 标记和提示，并修正 total。
 */
export function truncateOutput(jsonText: string, limit: number = CHARACTER_LIMIT): { text: string; truncated: boolean } {
  if (jsonText.length <= limit) {
    return { text: jsonText, truncated: false };
  }

  // 尝试在 JSON 对象边界截断，而不是粗暴截断字符串
  // 先解析再按条目截断
  try {
    const data = JSON.parse(jsonText);
    const result = truncateJsonData(data, limit);
    return { text: JSON.stringify(result.data, null, 2), truncated: result.wasTruncated };
  } catch {
    // 解析失败，回退到粗暴截断
    const cutoff = Math.floor(limit * 0.8);
    return {
      text: jsonText.slice(0, cutoff) + '\n\n⚠️ [输出已截断] 数据量超过限制，部分数据未显示。请缩小查询范围或增加分页。',
      truncated: true,
    };
  }
}

interface TruncateResult {
  data: any;
  wasTruncated: boolean;
}

function truncateJsonData(data: any, limit: number): TruncateResult {
  // 先估算截断后的 JSON 大小
  const estimatedSize = JSON.stringify(data).length;
  if (estimatedSize <= limit) {
    return { data, wasTruncated: false };
  }

  // 尝试截断顶层对象中的数组字段
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    return truncateObject(data, limit);
  }

  // 顶层就是数组，直接截断数组长度
  if (Array.isArray(data)) {
    return truncateArray(data, limit);
  }

  return { data, wasTruncated: false };
}

function truncateArray(arr: any[], limit: number): TruncateResult {
  if (arr.length === 0) return { data: arr, wasTruncated: false };

  // 二分查找合适的数组长度
  let lo = 0, hi = arr.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2);
    const subArr = arr.slice(0, mid);
    if (JSON.stringify(subArr).length <= limit) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }

  if (lo < arr.length) {
    return {
      data: arr.slice(0, Math.max(lo, 1)), // 至少保留 1 条
      wasTruncated: true,
    };
  }
  return { data: arr, wasTruncated: false };
}

function truncateObject(obj: Record<string, any>, limit: number): TruncateResult {
  const keys = Object.keys(obj);
  const arrayKeys = keys.filter(k => Array.isArray(obj[k]));

  if (arrayKeys.length === 0) {
    return { data: obj, wasTruncated: false };
  }

  // 优先截断最长的数组字段
  const sortedKeys = arrayKeys.sort((a, b) => JSON.stringify(obj[b]).length - JSON.stringify(obj[a]).length);

  for (const key of sortedKeys) {
    const arr = obj[key];
    if (arr.length > 0) {
      // 计算剩余可用空间（扣除非数组字段的大小）
      const otherKeys = keys.filter(k => k !== key);
      const otherData: Record<string, any> = {};
      for (const k of otherKeys) { otherData[k] = obj[k]; }
      const otherSize = JSON.stringify(otherData).length;
      const availableForArray = limit - otherSize;

      if (availableForArray <= 0) continue;

      const truncated = truncateArray(arr, availableForArray);
      if (truncated.wasTruncated) {
        const newObj = { ...obj, [key]: truncated.data };

        // 🔧 TR2: 修正 total 字段 — 截断后 total 应反映实际返回数量
        if (typeof newObj.total === 'number') {
          newObj.total = truncated.data.length;
        }

        newObj._truncatedInfo = {
          field: key,
          originalCount: arr.length,
          returnedCount: truncated.data.length,
        };
        return { data: newObj, wasTruncated: true };
      }
    }
  }

  return { data: obj, wasTruncated: false };
}