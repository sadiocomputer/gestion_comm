import { SearchListQueryDto } from '../../common/dto/search-list-query.dto';

/** GET /clients?search=...&status=active&page=1&limit=20 */
export class ListClientsQueryDto extends SearchListQueryDto {}
