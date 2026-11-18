import { test, expect } from '@playwright/test';
test('出发准备锁定地图、返回整备、窄屏与菜单焦点', async ({page}) => {
  await page.goto('/?test=1');
  await expect(page.locator('.cover-painting')).toHaveJSProperty('complete', true);
  await expect(page.locator('.cover-copy')).not.toContainText('乡野搜寻');
  await page.getByRole('button',{name:'新的游戏',exact:true}).focus();
  await expect(page.getByRole('button',{name:'新的游戏',exact:true})).toBeFocused();
  await page.emulateMedia({reducedMotion:'reduce'});
  expect(await page.locator('.cover-art').evaluate(e=>getComputedStyle(e).animationName)).toBe('none');
  await page.getByRole('button',{name:'临时测试入口',exact:true}).click();
  await page.evaluate(()=>{const g=(window as any).__game;g.save.temporary=false;g.save.defeated=[];});
  // Only render/map-selection actions below; do not persist this test fixture.
  await page.getByRole('button',{name:'准备出发',exact:true}).click();
  await page.locator('[data-action="map-select"][data-id="3"]').click();
  await expect(page.getByRole('button',{name:'开始行动',exact:true})).toBeDisabled();
  await expect(page.locator('[data-action=map-select][data-id="3"] [aria-label=未解锁]')).toBeVisible();
  await expect(page.locator('[data-action="map-select"][data-id="3"]')).toBeFocused();
  await page.locator('[data-action="map-select"][data-id="0"]').click();
  await expect(page.getByRole('button',{name:'开始行动',exact:true})).toBeEnabled();
  await expect(page.getByRole('heading',{name:'出发准备',exact:true})).toHaveCSS('color','rgb(255, 240, 214)');
  await page.screenshot({path:'test-results/departure-desktop.png',fullPage:true});
  await page.setViewportSize({width:640,height:900});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.locator('.agent-mode')).toBeVisible();
  await page.screenshot({path:'test-results/departure-narrow.png',fullPage:true});
  await page.getByRole('button',{name:'查看整备',exact:true}).click();
  await expect(page.locator('.inventory-page')).toBeVisible();
  await page.evaluate(()=>{(window as any).__game.save.temporary=true;});
});
