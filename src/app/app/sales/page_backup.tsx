"use client";
import { useRouter } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Home, Building2 } from 'lucide-react';
import { useI18n } from '@/i18n';

export default function SalesHub() {
  const { t } = useI18n();
  const router = useRouter();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('sales.title')}</h1>
        <div className="flex gap-2">
          <Button onClick={() => router.push('/app/sales/new/apartment')}>+ {t('sales.addApt')}</Button>
        </div>
      </div>

      <Tabs defaultValue="apt" className="w-full">
        <TabsList className="mb-4 flex gap-2">
          <TabsTrigger value="apt">{t('sales.aptTab')}</TabsTrigger>
          <TabsTrigger value="dev">{t('sales.devTab')}</TabsTrigger>
        </TabsList>

        {/* Квартиры (вторичный рынок) */}
        <TabsContent value="apt">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle>{t('sales.addApt')}</CardTitle>
                <CardDescription>
                  Создайте карточку объекта: адрес, параметры, цена, статус и фотографии.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Для разовых сделок и вторички.</div>
                <Button onClick={() => router.push('/app/sales/new/apartment')}>+ {t('sales.newApt')}</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('sales.listApt')}</CardTitle>
                <CardDescription>
                  Список квартир с фильтрами по городу, комнатам, цене и статусу.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">{t('sales.emptyApt')}</div>
                <Button variant="outline" onClick={() => router.push('/app/sales/secondary')}>
                  {t('common.openList')}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 rounded-xl border border-dashed py-12 text-center">
            <div className="mb-2 flex items-center justify-center">
              <Home className="h-10 w-10 text-zinc-400" />
            </div>
            <div className="mb-4 text-muted-foreground">{t('sales.emptyApt')}</div>
            <div className="flex justify-center gap-2">
              <Button onClick={() => router.push('/app/sales/new/apartment')}>+ {t('sales.addApt')}</Button>
            </div>
          </div>
        </TabsContent>

        {/* Проекты застройщика */}
        <TabsContent value="dev">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle>{t('sales.createProject')}</CardTitle>
                <CardDescription>
                  Введите параметры ЖК: название, город, застройщик, сроки сдачи, секции.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Удобно для новостроек, очередей и корпусов.
                </div>
                <Button onClick={() => router.push('/app/sales/new/project')}>
                  + Новый проект
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Проекты</CardTitle>
                <CardDescription>
                  Управляйте пулом проектов, типами планировок и инвентарём по секциям.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Список проектов доступен в отдельном разделе.
                </div>
                <Button variant="outline" onClick={() => router.push('/app/sales/developer')}>
                  {t('sales.openProjects')}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 rounded-xl border border-dashed py-12 text-center">
            <div className="mb-2 flex items-center justify-center">
              <Building2 className="h-10 w-10 text-zinc-400" />
            </div>
            <div className="mb-4 text-muted-foreground">{t('sales.emptyProjects')}</div>
            <Button onClick={() => router.push('/app/sales/new/project')}>
              + Добавить проект
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}


