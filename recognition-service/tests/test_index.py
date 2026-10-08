import numpy as np
import pytest

from app.index import IndexVersionMismatch, ReferenceIndex


def test_persistence_and_idempotent_upsert_delete(tmp_path):
    index = ReferenceIndex(tmp_path, "encoder-v1")
    index.upsert(17, 5, np.array([3, 0]), b"original-photo")
    index.upsert(17, 6, np.array([0, 9]), b"replacement-photo")
    assert index.count == 1
    assert index.search(np.array([0, 1]), {17}, 5) == [
        {"idReferencia": 17, "idProducto": 6, "score": 1.0}]
    index.close()

    reloaded = ReferenceIndex(tmp_path, "encoder-v1")
    assert reloaded.count == 1
    assert reloaded.search(np.array([0, 5]), {17}, 5)[0]["idProducto"] == 6
    stored = reloaded._db.execute("SELECT image FROM references_visual WHERE id=17").fetchone()
    assert stored == (b"replacement-photo",)
    reloaded.delete(17)
    reloaded.delete(17)
    reloaded.close()

    empty = ReferenceIndex(tmp_path, "encoder-v1")
    assert empty.count == 0
    empty.close()


def test_filter_before_ranking_and_distinct_products(tmp_path):
    index = ReferenceIndex(tmp_path, "encoder-v1")
    try:
        index.upsert(1, 100, np.array([1, 0]), b"one")
        index.upsert(2, 200, np.array([0.95, 0.05]), b"two")
        index.upsert(3, 200, np.array([0.90, 0.10]), b"three")
        index.upsert(4, 300, np.array([0, 1]), b"four")
        matches = index.search(np.array([1, 0]), {2, 3, 4, 999}, 2)
        assert [match["idProducto"] for match in matches] == [200, 300]
        assert matches[0]["idReferencia"] == 2
        assert index.search(np.array([1, 0]), set(), 20) == []
        assert all(-1 <= match["score"] <= 1 for match in matches)
    finally:
        index.close()


def test_version_change_requires_explicit_reindex(tmp_path):
    first = ReferenceIndex(tmp_path, "encoder-v1")
    first.upsert(1, 2, np.array([1, 0]), b"photo")
    first.close()
    with pytest.raises(IndexVersionMismatch, match="reindexa"):
        ReferenceIndex(tmp_path, "encoder-v2")
    same = ReferenceIndex(tmp_path, "encoder-v1")
    assert same.count == 1
    same.close()


def test_dimensions_and_bad_vectors_do_not_modify_catalog(tmp_path):
    index = ReferenceIndex(tmp_path, "encoder-v1")
    try:
        index.upsert(1, 2, np.array([1, 0]), b"photo")
        with pytest.raises(ValueError, match="dimensión"):
            index.upsert(2, 3, np.array([1, 0, 0]), b"photo")
        for bad in [np.array([0, 0]), np.array([np.nan, 1]), np.array([np.inf, 1])]:
            with pytest.raises(ValueError):
                index.upsert(2, 3, bad, b"photo")
        assert index.count == 1
    finally:
        index.close()


def test_exclusive_writer(tmp_path):
    first = ReferenceIndex(tmp_path, "v1")
    try:
        with pytest.raises(RuntimeError, match="workers 1"):
            ReferenceIndex(tmp_path, "v1")
    finally:
        first.close()
