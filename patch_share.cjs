const fs = require('fs');
let code = fs.readFileSync('src/utils/customCountryStore.ts', 'utf8');

const targetFunction = `export async function shareOrDownloadCustomCountry(country: CustomCountry): Promise<{ shared: boolean; downloaded: boolean }> {
  if (!country) return { shared: false, downloaded: false };
  const exportData = {
    type: 'CUSTOM_COUNTRY_EXPORT',
    version: '1.0',
    exportTime: new Date().toISOString(),
    country
  };
  const jsonStr = JSON.stringify(exportData, null, 2);
  const cleanName = country.name.replace(/^🎨\\s*\\[.*?\\]\\s*/, '').replace(/^\\d+:\\s*/, '').replace(/[^\\w\\u4e00-\\u9fa5]/g, '_') || 'custom_country';
  const filename = \`自定义国家_\${cleanName}.json\`;

  if (typeof navigator !== 'undefined' && navigator.share) {
    // 1. Try application/json file share
    const jsonFile = new File([jsonStr], filename, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [jsonFile] })) {
      try {
        await navigator.share({
          files: [jsonFile],
          title: \`自定义国家: \${country.name}\`,
          text: \`这是在《现代战争模拟器》中生成的自定义国家领土数据: \${country.name}\`
        });
        return { shared: true, downloaded: false };
      } catch (e: any) {
        if (e?.name === 'AbortError') return { shared: true, downloaded: false };
      }
    }

    // 2. Try text/plain file share (supported on wider range of mobile devices)
    const txtFile = new File([jsonStr], \`自定义国家_\${cleanName}.txt\`, { type: 'text/plain' });
    if (navigator.canShare && navigator.canShare({ files: [txtFile] })) {
      try {
        await navigator.share({
          files: [txtFile],
          title: \`自定义国家: \${country.name}\`,
          text: \`这是在《现代战争模拟器》中生成的自定义国家领土数据: \${country.name}\`
        });
        return { shared: true, downloaded: false };
      } catch (e: any) {
        if (e?.name === 'AbortError') return { shared: true, downloaded: false };
      }
    }

    // 3. Try sharing text payload directly
    try {
      await navigator.share({
        title: \`自定义国家: \${country.name}\`,
        text: \`【自定义国家配置: \${country.name}】\\n可在模拟器中解析导入：\\n\${jsonStr}\`
      });
      return { shared: true, downloaded: false };
    } catch (e: any) {
      if (e?.name === 'AbortError') return { shared: true, downloaded: false };
    }
  }

  // Fallback to local file download
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return { shared: false, downloaded: true };
}`;

const newFunction = `export async function shareOrDownloadCustomCountry(country: CustomCountry): Promise<{ shared: boolean; downloaded: boolean }> {
  if (!country) return { shared: false, downloaded: false };
  const exportData = {
    type: 'CUSTOM_COUNTRY_EXPORT',
    version: '1.0',
    exportTime: new Date().toISOString(),
    country
  };
  const jsonStr = JSON.stringify(exportData, null, 2);
  const cleanName = country.name.replace(/^🎨\\s*\\[.*?\\]\\s*/, '').replace(/^\\d+:\\s*/, '').replace(/[^\\w\\u4e00-\\u9fa5]/g, '_') || 'custom_country';
  const filename = \`自定义国家_\${cleanName}.json\`;

  if (typeof navigator !== 'undefined' && navigator.share) {
    // 强制使用 Web Share API 分享文件（部分浏览器 canShare 不准）
    try {
      const jsonFile = new File([jsonStr], filename, { type: 'application/json' });
      const txtFile = new File([jsonStr], \`自定义国家_\${cleanName}.txt\`, { type: 'text/plain' });
      
      // 优先分享文件
      if (navigator.canShare && navigator.canShare({ files: [txtFile] })) {
        await navigator.share({
          files: [txtFile],
          title: \`自定义国家: \${country.name}\`,
        });
        return { shared: true, downloaded: false };
      } else {
        // 如果 canShare 说不行，我们强行传文件，很多浏览器兼容
        await navigator.share({
          files: [jsonFile],
          title: \`自定义国家: \${country.name}\`,
        });
        return { shared: true, downloaded: false };
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') return { shared: true, downloaded: false };
      // 不要分享巨大文本，直接走到下面的下载逻辑
      console.warn('Share API failed for files', e);
    }
  }

  // Fallback to local file download
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return { shared: false, downloaded: true };
}`;

// I will use manual substring replacement instead of regex to avoid whitespace issues
const startIndex = code.indexOf('export async function shareOrDownloadCustomCountry');
const endString = `  return { shared: false, downloaded: true };\n}`;
const endIndex = code.indexOf(endString, startIndex) + endString.length;

if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
  code = code.substring(0, startIndex) + newFunction + code.substring(endIndex);
  fs.writeFileSync('src/utils/customCountryStore.ts', code);
  console.log("Updated share API");
} else {
  console.log("Failed to find target");
}
