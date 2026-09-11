// 服务端记录的地区标签有两种形态：ISO 3166-1 两位国家代码（"ID"、"JP"），
// 以及中国的省级名称（"广东"、"香港"）。代码在这里按界面语言翻译成国家名；
// 省级名称和老数据里的中文国名（保留期内还会出现）原样展示。同一个国家的
// 新旧写法翻译后落到同一个名字，所以按翻译结果汇总就不会出现两行。

const REGION_CODE = /^[A-Z]{2}$/;

const displayNamesByLanguage = new Map<string, Intl.DisplayNames | null>();

const displayNames = (language: string): Intl.DisplayNames | null => {
  const cached = displayNamesByLanguage.get(language);
  if (cached !== undefined) return cached;
  let names: Intl.DisplayNames | null = null;
  try {
    names = new Intl.DisplayNames([language], {
      type: 'region',
      fallback: 'code',
    });
  } catch {
    names = null;
  }
  displayNamesByLanguage.set(language, names);
  return names;
};

export const isRegionCode = (value: string): boolean => REGION_CODE.test(value);

/** 把地区标签变成当前语言下的显示名；不是国家代码的标签原样返回。 */
export const formatRegion = (region: string, language: string): string => {
  const value = region.trim();
  if (!isRegionCode(value)) return value;
  const name = displayNames(language)?.of(value);
  return name && name.length > 0 ? name : value;
};
