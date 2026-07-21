from rest_framework.pagination import PageNumberPagination


class StandardResultsPagination(PageNumberPagination):
    """count/next/previous/results envelope. Applied explicitly per-view (not globally
    via DEFAULT_PAGINATION_CLASS) because some list endpoints — e.g. billing's
    PricingView — are public, small, and consumed by frontend code expecting a flat
    array; making every list endpoint paginated would silently change their response
    shape too. page_size is deliberately generous: large enough that a real user's own
    history won't hit it any time soon, small enough that a single request can no longer
    return an unbounded, ever-growing result set (the actual problem — see the doctor
    referral inbox, a shared pool with no natural per-user cap)."""

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100
