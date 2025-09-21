select now() as db_time;
select count(*) as events from master_events;
select * from master_events order by event_date asc limit 3;
