import { bench, run } from "mitata";

// Dummy data generator
const generateData = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
    deps: i % 2 === 0 ? { 'foo': 'bar' } : null,
  }));
};

const smallData = generateData(10);
const mediumData = generateData(100);
const largeData = generateData(10000);

bench("Filter + Map (Small)", () => {
  smallData
    .filter((v) => !!v.deps)
    .map((v) => ({
      key: `v_${v.id}`,
      label: v.name,
    }));
});

bench("Reduce (Small)", () => {
  smallData.reduce((acc, v) => {
    if (v.deps) {
      acc.push({
        key: `v_${v.id}`,
        label: v.name,
      });
    }
    return acc;
  }, [] as any[]);
});

bench("FlatMap (Small)", () => {
  smallData.flatMap((v) =>
    v.deps
      ? [
          {
            key: `v_${v.id}`,
            label: v.name,
          },
        ]
      : []
  );
});

bench("Filter + Map (Medium)", () => {
  mediumData
    .filter((v) => !!v.deps)
    .map((v) => ({
      key: `v_${v.id}`,
      label: v.name,
    }));
});

bench("Reduce (Medium)", () => {
  mediumData.reduce((acc, v) => {
    if (v.deps) {
      acc.push({
        key: `v_${v.id}`,
        label: v.name,
      });
    }
    return acc;
  }, [] as any[]);
});

bench("FlatMap (Medium)", () => {
  mediumData.flatMap((v) =>
    v.deps
      ? [
          {
            key: `v_${v.id}`,
            label: v.name,
          },
        ]
      : []
  );
});

bench("Filter + Map (Large)", () => {
  largeData
    .filter((v) => !!v.deps)
    .map((v) => ({
      key: `v_${v.id}`,
      label: v.name,
    }));
});

bench("Reduce (Large)", () => {
  largeData.reduce((acc, v) => {
    if (v.deps) {
      acc.push({
        key: `v_${v.id}`,
        label: v.name,
      });
    }
    return acc;
  }, [] as any[]);
});

bench("FlatMap (Large)", () => {
  largeData.flatMap((v) =>
    v.deps
      ? [
          {
            key: `v_${v.id}`,
            label: v.name,
          },
        ]
      : []
  );
});

await run();
