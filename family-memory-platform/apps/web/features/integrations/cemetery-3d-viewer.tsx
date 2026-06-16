'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui';
import { PageHero } from '@family/ui';
import { apiClient, formatApiError } from '@/lib/api-client';

type Reconstruction = {
  plotLabel?: string | null;
  cemeteryName?: string;
  person?: { displayName?: string } | null;
  ground: { widthM: number; depthM: number };
  monuments: Array<{
    id: string;
    title: string;
    inscription?: string | null;
    widthM: number;
    heightM: number;
    depthM: number;
    x: number;
    z: number;
  }>;
};

function MonumentMesh({
  monument,
}: {
  monument: Reconstruction['monuments'][number];
}) {
  return (
    <group position={[monument.x, monument.heightM / 2, monument.z]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[monument.widthM, monument.heightM, monument.depthM]} />
        <meshStandardMaterial color="#8a8f98" roughness={0.85} />
      </mesh>
      <Text position={[0, monument.heightM / 2 + 0.08, monument.depthM / 2 + 0.01]} fontSize={0.08} maxWidth={0.55} color="#f5f5f4">
        {monument.title}
      </Text>
    </group>
  );
}

function CemeteryScene({ data }: { data: Reconstruction }) {
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight castShadow intensity={1.1} position={[3, 6, 2]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[data.ground.widthM, data.ground.depthM]} />
        <meshStandardMaterial color="#3f6212" />
      </mesh>
      {data.monuments.map((m) => (
        <MonumentMesh key={m.id} monument={m} />
      ))}
      <OrbitControls makeDefault target={[0, 0.6, 0]} />
    </>
  );
}

export function Cemetery3DViewer({ burialSiteId }: { burialSiteId: string }) {
  const { session, isReady } = useAuth();
  const t = useTranslations('block5.cemetery');
  const [data, setData] = useState<Reconstruction | null>(null);
  const [error, setError] = useState('');
  const [photoStatus, setPhotoStatus] = useState('');

  useEffect(() => {
    if (!isReady || !session?.accessToken) return;
    void (async () => {
      try {
        const payload = (await apiClient.cemetery.reconstruction(burialSiteId, session.accessToken)) as Reconstruction;
        setData(payload);
      } catch (err) {
        setError(formatApiError(err));
      }
    })();
  }, [burialSiteId, isReady, session?.accessToken]);

  const title = data?.person?.displayName ?? data?.plotLabel ?? t('title');

  async function queuePhotogrammetry() {
    if (!session?.accessToken) return;
    setPhotoStatus('');
    try {
      const job = (await apiClient.cemetery.requestPhotogrammetry(burialSiteId, {}, session.accessToken)) as {
        id: string;
      };
      setPhotoStatus(t('photogrammetryQueued'));
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        const status = (await apiClient.cemetery.getPhotogrammetryJob(job.id, session.accessToken)) as {
          status?: string;
        };
        if (status.status === 'COMPLETED') {
          const payload = (await apiClient.cemetery.reconstruction(burialSiteId, session.accessToken)) as Reconstruction;
          setData(payload);
          break;
        }
        if (status.status === 'FAILED') break;
      }
    } catch (err) {
      setPhotoStatus(formatApiError(err));
    }
  }

  return (
    <div className="space-y-4">
      <PageHero
        eyebrow={t('view3dEyebrow')}
        title={title}
        description={data?.cemeteryName ?? t('view3dDescription')}
        action={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => void queuePhotogrammetry()}>
              {t('requestPhotogrammetry')}
            </Button>
            <Link href="/cemeteries/map">
              <Button variant="secondary">{t('openMap')}</Button>
            </Link>
          </div>
        }
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {photoStatus ? <p className="text-sm text-stone-600">{photoStatus}</p> : null}
      <div className="h-[min(70vh,640px)] overflow-hidden rounded-xl border bg-slate-950 dark:border-slate-700">
        {data ? (
          <Canvas shadows camera={{ position: [2.5, 1.8, 2.5], fov: 50 }}>
            <CemeteryScene data={data} />
          </Canvas>
        ) : (
          <p className="p-6 text-sm text-stone-400">{t('loading3d')}</p>
        )}
      </div>
    </div>
  );
}
